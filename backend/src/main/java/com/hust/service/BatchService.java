package com.hust.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hust.dto.request.BatchGenerateRequest;
import com.hust.dto.response.PresentationResponse;
import com.hust.dto.response.SlideDataDTO;
import com.hust.entity.*;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.PresentationRepository;
import com.hust.repository.SlideRepository;
import com.hust.repository.TemplateSlideRepository;
import com.hust.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class BatchService {

    public static class BatchGenerateResult {
        private final List<PresentationResponse> created;
        private final List<String> warnings;

        public BatchGenerateResult(List<PresentationResponse> created, List<String> warnings) {
            this.created = created;
            this.warnings = warnings;
        }

        public List<PresentationResponse> getCreated() {
            return created;
        }

        public List<String> getWarnings() {
            return warnings;
        }
    }

    private record TitleAndBody(String title, String body) {
    }

    private record LessonMeta(String subject, String lesson) {
    }

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PresentationRepository presentationRepository;
    @Autowired
    private SlideRepository slideRepository;
    @Autowired
    private TemplateSlideRepository templateSlideRepository;
    @Autowired
    private ObjectMapper objectMapper;
    // @Autowired private HistoryLogService historyLogService;

    // --- 1. Xử lý Upload và Preview (POST /api/batch/upload) ---
    public List<SlideDataDTO> parseFile(MultipartFile file, Integer currentUserId) {

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Tệp tải lên không được để trống.");
        }

        // Kiểm tra loại tệp (Business Rule: Chỉ chấp nhận Excel/CSV)
        String fileName = file.getOriginalFilename();
        if (fileName == null || (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls"))) {
            throw new IllegalArgumentException("Định dạng tệp không hợp lệ. Chỉ chấp nhận Excel (.xlsx, .xls).");
        }

        List<SlideDataDTO> dataList = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream()) {
            Workbook workbook = WorkbookFactory.create(inputStream);
            DataFormatter formatter = new DataFormatter();
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            Sheet sheet = workbook.getSheetAt(0);

            // Bỏ qua hàng tiêu đề (hàng 0)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                // Giả định: Cột 0 là Tên Slide, Cột 1 là Nội dung
                String name = getCellValue(row.getCell(0), formatter, evaluator);
                String contentRaw = getCellValue(row.getCell(1), formatter, evaluator);
                String content = contentRaw;

                // Nếu cột B là Google Docs link (public), tải về text để dùng làm content.
                // Nếu không tải được (private/forbidden/invalid), đánh dấu error cho dòng này.
                if (!contentRaw.isBlank() && looksLikeUrl(contentRaw)) {
                    try {
                        String resolved = tryResolveGoogleDocsToText(contentRaw);
                        if (resolved != null) {
                            content = resolved;
                        }
                    } catch (Exception e) {
                        dataList.add(SlideDataDTO.builder()
                                .name(name)
                                .content(contentRaw)
                                .error(true)
                                .errorMessage(
                                        "Không thể đọc nội dung từ link Google Docs (cần public hoặc đúng định dạng).")
                                .build());
                        continue;
                    }
                }

                boolean nameBlank = name.isBlank();
                boolean contentBlank = content.isBlank();

                // Skip fully empty rows (common when sheets contain formatting down to many
                // rows)
                if (nameBlank && contentBlank) {
                    continue;
                }

                // Validation nghiệp vụ: (Business Rule No. 5)
                if (nameBlank || contentBlank) {
                    String errorMsg;
                    if (nameBlank && contentBlank) {
                        errorMsg = "Dòng " + (i + 1) + ": Dữ liệu trống.";
                    } else if (nameBlank) {
                        errorMsg = "Dòng " + (i + 1) + ": Thiếu Tiêu đề (Subject/Slide Name).";
                    } else {
                        errorMsg = "Dòng " + (i + 1) + ": Thiếu Nội dung slide.";
                    }

                    dataList.add(SlideDataDTO.builder()
                            .name(name)
                            .content(content)
                            .error(true)
                            .errorMessage(errorMsg) // Message chi tiết
                            .build());
                } else {
                    dataList.add(SlideDataDTO.builder()
                            .name(name)
                            .content(content)
                            .error(false)
                            .build());
                }
            }

        } catch (IOException e) {
            log.error("Lỗi khi đọc file Excel: {}", e.getMessage());
            throw new IllegalArgumentException("Lỗi đọc file: Tệp Excel bị hỏng hoặc sai định dạng.");        }

        if (dataList.isEmpty()) {
            throw new IllegalArgumentException("Tệp không chứa dữ liệu slide hợp lệ.");
        }
        return dataList;
    }

    private static final Pattern GOOGLE_DOC_ID = Pattern
            .compile("https?://docs\\.google\\.com/document/(?:u/\\d+/)?d/([a-zA-Z0-9_-]+)");
    private static final int MAX_DOC_BYTES = 2 * 1024 * 1024; // 2MB safety cap

    private boolean looksLikeUrl(String raw) {
        String t = raw == null ? "" : raw.trim();
        return t.startsWith("http://") || t.startsWith("https://");
    }

    /**
     * Trả về text (plain) nếu là link Google Docs hợp lệ và public; ngược lại trả
     * về null.
     * Lưu ý: Docs private cần OAuth/cookie nên server sẽ không đọc được.
     */
    private String tryResolveGoogleDocsToText(String maybeUrl) throws Exception {
        String url = maybeUrl == null ? "" : maybeUrl.trim();
        Matcher m = GOOGLE_DOC_ID.matcher(url);
        if (!m.find())
            return null;

        String docId = m.group(1);
        String exportUrl = "https://docs.google.com/document/d/" + docId + "/export?format=txt";

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(exportUrl))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "QuickSlide/1.0")
                .GET()
                .build();

        HttpResponse<byte[]> res = client.send(req, HttpResponse.BodyHandlers.ofByteArray());
        int code = res.statusCode();
        if (code < 200 || code >= 300) {
            throw new IllegalStateException("Fetch failed: HTTP " + code);
        }

        byte[] body = res.body() == null ? new byte[0] : res.body();
        if (body.length == 0)
            return "";
        if (body.length > MAX_DOC_BYTES) {
            throw new IllegalStateException("Doc too large");
        }

        String text = new String(body, java.nio.charset.StandardCharsets.UTF_8);
        // Normalize line endings
        return text.replace("\r\n", "\n").trim();
    }

    @Transactional
    public BatchGenerateResult createBatchSlides(BatchGenerateRequest request, Integer currentUserId) {

        User owner = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại."));

        boolean hasCriticalErrors = request.getSlides().stream()
                .anyMatch(SlideDataDTO::isError);
        if (hasCriticalErrors) {
            throw new IllegalArgumentException("Dữ liệu chứa lỗi và không thể tạo slide. Vui lòng sửa lại tệp.");
        }
        final Integer templateSlideId = request.getTemplateSlideId();

        TemplateSlide repeatedLayout = null;
        List<TemplateSlide> templateDeckSlides = null;

        repeatedLayout = templateSlideRepository.findById(templateSlideId != null ? templateSlideId : 1)
                .orElseThrow(() -> new ResourceNotFoundException("Layout Template không tồn tại."));

        Instant now = Instant.now();
        List<PresentationResponse> created = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        for (SlideDataDTO row : request.getSlides()) {
            LessonMeta meta = parseLessonMeta(row.getName());
            String presentationTitle = (meta.lesson != null && !meta.lesson.isBlank())
                    ? meta.lesson
                    : (meta.subject != null && !meta.subject.isBlank())
                            ? meta.subject
                            : (row.getName() == null ? "Batch Presentation" : row.getName());

            List<String> slideBlocks = splitSlideBlocks(row.getContent(), true);
            if (slideBlocks.isEmpty()) {
                throw new IllegalArgumentException("Nội dung rỗng hoặc không hợp lệ cho bài: " + presentationTitle);
            }

            if (templateDeckSlides != null) {
                int maxSlides = templateDeckSlides.size();
                if (slideBlocks.size() > maxSlides) {
                    // Create only up to template slide count, but return a warning to the client.
                    warnings.add(
                            "Số lượng nội dung bạn gửi yêu cầu quá số lượng trang: "
                                    + slideBlocks.size()
                                    + " trang so với mẫu templates ở bài thuyết trình "
                                    + presentationTitle
                                    + " (mẫu có "
                                    + maxSlides
                                    + " trang).");
                    slideBlocks = slideBlocks.subList(0, maxSlides);
                }
            }

            Presentation presentation = new Presentation();
            presentation.setOwner(owner);
            presentation.setTitle(presentationTitle);
            presentation.setCreatedAt(now);
            presentation.setEditedDate(now);
            Presentation savedPresentation = presentationRepository.save(presentation);

            AtomicInteger slideIndex = new AtomicInteger(1);
            for (int i = 0; i < slideBlocks.size(); i++) {
                String block = slideBlocks.get(i);
                TitleAndBody parsed = parseTitleAndBodyFromBlock(block);
                if (parsed.title == null || parsed.title.isBlank()) {
                    throw new IllegalArgumentException(
                            "Thiếu title (dòng đầu) cho một slide trong bài: " + presentationTitle);
                }

                Slide slide = new Slide();
                slide.setPresentation(savedPresentation);
                slide.setSlideIndex(slideIndex.getAndIncrement());

                TemplateSlide layoutForSlide = templateDeckSlides != null
                        ? templateDeckSlides.get(i)
                        : repeatedLayout;
                slide.setLayoutUsed(layoutForSlide);

                String contentJson = generateContentJsonFromTemplateAndData(
                        layoutForSlide != null ? layoutForSlide.getLayoutJson() : "{\"elements\": []}",
                        parsed.title,
                        parsed.body,
                        meta.subject,
                        meta.lesson);
                slide.setContentJson(contentJson);
                slideRepository.save(slide);
            }

            created.add(PresentationResponse.builder()
                    .id(savedPresentation.getId())
                    .title(savedPresentation.getTitle())
                    .ownerUsername(owner.getUsername())
                    .editedDate(savedPresentation.getEditedDate())
                    .build());
        }

        return new BatchGenerateResult(created, warnings);
    }

    private LessonMeta parseLessonMeta(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.isBlank())
            return new LessonMeta("", "");

        // 1) Nếu người dùng xuống dòng trong cell: dòng 1=subject, dòng 2=lesson
        String normalized = s.replace("\r\n", "\n");
        if (normalized.contains("\n")) {
            String[] lines = normalized.split("\n");
            List<String> nonEmpty = new ArrayList<>();
            for (String line : lines) {
                String t = line == null ? "" : line.trim();
                if (!t.isBlank())
                    nonEmpty.add(t);
            }
            if (nonEmpty.size() >= 2) {
                return new LessonMeta(nonEmpty.get(0), nonEmpty.get(1));
            }
            if (nonEmpty.size() == 1) {
                return new LessonMeta("", nonEmpty.get(0));
            }
        }

        // 2) Nếu dùng separator "|": "subject | lesson"
        if (s.contains("|")) {
            String[] parts = s.split("\\|", 2);
            String subject = parts.length > 0 ? parts[0].trim() : "";
            String lesson = parts.length > 1 ? parts[1].trim() : "";
            if (!subject.isBlank() || !lesson.isBlank())
                return new LessonMeta(subject, lesson.isBlank() ? subject : lesson);
        }

        // 3) Nếu dùng " - " : "subject - lesson"
        if (s.contains(" - ")) {
            String[] parts = s.split("\\s-\\s", 2);
            String subject = parts.length > 0 ? parts[0].trim() : "";
            String lesson = parts.length > 1 ? parts[1].trim() : "";
            if (!subject.isBlank() || !lesson.isBlank())
                return new LessonMeta(subject, lesson.isBlank() ? subject : lesson);
        }

        // Fallback: coi như lesson
        return new LessonMeta("", s);
    }

    private List<String> splitSlideBlocks(String raw, boolean dropEmpty) {
        if (raw == null)
            return List.of();
        String normalized = raw.replace("\r\n", "\n");
        if (normalized.isBlank())
            return List.of();

        String[] parts = normalized.split("\\n\\s*---\\s*\\n", -1);
        if (parts.length == 1 && normalized.contains("---")) {
            parts = normalized.split("\\s*---\\s*", -1);
        }

        ArrayList<String> out = new ArrayList<>();
        for (String p : parts) {
            String t = p == null ? "" : p.trim();
            if (dropEmpty) {
                if (!t.isEmpty())
                    out.add(t);
            } else {
                out.add(t);
            }
        }
        if (dropEmpty)
            return out;
        boolean anyNonEmpty = out.stream().anyMatch(x -> x != null && !x.isBlank());
        return anyNonEmpty ? out : List.of();
    }

    private TitleAndBody parseTitleAndBodyFromBlock(String rawBlock) {
        if (rawBlock == null)
            return new TitleAndBody("", "");
        String normalized = rawBlock.replace("\r\n", "\n").trim();
        if (normalized.isBlank())
            return new TitleAndBody("", "");

        String[] lines = normalized.split("\n", -1);
        int idx = 0;
        while (idx < lines.length && (lines[idx] == null || lines[idx].trim().isEmpty()))
            idx++;
        String title = idx < lines.length ? String.valueOf(lines[idx]).trim() : "";
        idx++;

        StringBuilder body = new StringBuilder();
        for (int i = idx; i < lines.length; i++) {
            body.append(lines[i] == null ? "" : lines[i]);
            if (i < lines.length - 1)
                body.append("\n");
        }
        return new TitleAndBody(title, body.toString().trim());
    }

    // --- Helper để lấy giá trị Cell (Tránh lỗi Null và định dạng) ---
    private String getCellValue(Cell cell, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (cell == null)
            return "";
        try {
            String v = formatter.formatCellValue(cell, evaluator);
            return v != null ? v.trim() : "";
        } catch (Exception e) {
            return "";
        }
    }

    // --- Helper Mockup: Chèn dữ liệu vào Template Layout JSON ---
    private String generateContentJsonFromTemplateAndData(String templateLayoutJson, String title, String content,
            String subject, String lesson) {
        // Build JSON safely (avoid String.format issues with '%' and escape
        // quotes/newlines correctly)
        try {
            JsonNode templateNode;
            if (templateLayoutJson != null && !templateLayoutJson.isBlank()) {
                templateNode = objectMapper.readTree(templateLayoutJson);
            } else {
                ObjectNode empty = objectMapper.createObjectNode();
                empty.putArray("elements");
                templateNode = empty;
            }

            ObjectNode root = objectMapper.createObjectNode();
            root.set("template", templateNode);

            ObjectNode data = objectMapper.createObjectNode();
            data.put("subject", subject == null ? "" : subject);
            data.put("lesson", lesson == null ? "" : lesson);
            data.put("title", title == null ? "" : title);
            data.put("content", content == null ? "" : content);
            data.put("type", "text-slide");
            root.set("data", data);

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            // Last-resort fallback: keep raw template JSON and JSON-escape title/content
            try {
                String safeTemplate = (templateLayoutJson != null && !templateLayoutJson.isBlank())
                        ? templateLayoutJson
                        : "{\"elements\": []}";
                String safeSubject = objectMapper.writeValueAsString(subject == null ? "" : subject);
                String safeLesson = objectMapper.writeValueAsString(lesson == null ? "" : lesson);
                String safeTitle = objectMapper.writeValueAsString(title == null ? "" : title);
                String safeContent = objectMapper.writeValueAsString(content == null ? "" : content);
                return "{\"template\": " + safeTemplate + ", \"data\": {\"subject\": " + safeSubject + ", \"lesson\": "
                        + safeLesson + ", \"title\": " + safeTitle + ", \"content\": " + safeContent
                        + ", \"type\": \"text-slide\"}}";
            } catch (Exception ignored) {
                return "{\"template\": {\"elements\": []}, \"data\": {\"subject\": \"\", \"lesson\": \"\", \"title\": \"\", \"content\": \"\", \"type\": \"text-slide\"}}";
            }
        }
    }
}
