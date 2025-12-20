package com.hust.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hust.dto.request.QuickCreateRequest;
import com.hust.dto.request.SlideUpdateRequest;
import com.hust.dto.request.SaveExportRequest;
import com.hust.dto.response.PresentationResponse;
import com.hust.dto.response.SlideResponse;
import com.hust.entity.*;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.PresentationRepository;
import com.hust.repository.SlideRepository;
import com.hust.repository.TemplateRepository;
import com.hust.repository.TemplateSlideRepository;
import com.hust.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.PDPageContentStream;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class SlideService {

    private record TitleAndBody(String title, String body) {
    }

    private static final double EDITOR_CANVAS_W = 800.0;
    private static final double EDITOR_CANVAS_H = 600.0;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PresentationRepository presentationRepository;
    @Autowired
    private SlideRepository slideRepository;
    @Autowired
    private TemplateSlideRepository templateSlideRepository;
    @Autowired
    private TemplateRepository templateRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @Transactional
    public PresentationResponse createQuickSlide(QuickCreateRequest request, Integer currentUserId) {

        User owner = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại."));

        List<String> titleBlocks = splitSlideBlocks(request.getTitle(), true);
        List<String> contentBlocksNonEmpty = splitSlideBlocks(request.getContent(), true);
        boolean hasPerSlideTitles = titleBlocks.size() > 1;
        boolean hasPerSlideContents = contentBlocksNonEmpty.size() > 1;

        if (request.getTemplateId() != null) {
            Template template = templateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new ResourceNotFoundException("Template không tồn tại."));

            // Template public ai cũng xem được; template private yêu cầu đúng owner.
            if (Boolean.FALSE.equals(template.getIsPublic())) {
                throw new SecurityException("Bạn không có quyền sử dụng Template này.");
            }

            List<TemplateSlide> templateSlides = templateSlideRepository
                    .findByTemplateIdOrderBySlideOrderAsc(template.getId());
            if (templateSlides == null || templateSlides.isEmpty()) {
                throw new IllegalArgumentException("Template này chưa có slide nào.");
            }

            boolean legacyStructuredMode = isStructuredContent(request.getContent());
            List<String> legacyParagraphs = legacyStructuredMode ? List.of() : splitParagraphs(request.getContent());
            int paragraphCursor = 0;

            Instant now = Instant.now();
            Presentation presentation = new Presentation();
            presentation.setOwner(owner);
            presentation.setBasedOnTemplate(template);
            String presentationTitle = (hasPerSlideTitles && !titleBlocks.isEmpty()) ? titleBlocks.get(0)
                    : request.getTitle();
            presentation.setTitle(presentationTitle);
            presentation.setCreatedAt(now);
            presentation.setEditedDate(now);
            Presentation savedPresentation = presentationRepository.save(presentation);

            int slideIndex = 1;
            for (int i = 0; i < templateSlides.size(); i++) {
                TemplateSlide ts = templateSlides.get(i);

                String perSlideTitle = request.getTitle();
                String slideContent;

                if (hasPerSlideContents) {
                    String rawBlock = i < contentBlocksNonEmpty.size() ? contentBlocksNonEmpty.get(i) : "";
                    TitleAndBody parsed = parseTitleAndBodyFromBlock(rawBlock);
                    String inferredTitle = parsed.title;

                    if (hasPerSlideTitles && !titleBlocks.isEmpty()) {
                        perSlideTitle = i < titleBlocks.size() ? titleBlocks.get(i) : titleBlocks.get(0);
                    } else if (inferredTitle != null && !inferredTitle.isBlank()) {
                        perSlideTitle = inferredTitle;
                    }

                    slideContent = parsed.body;
                } else {
                    if (hasPerSlideTitles && !titleBlocks.isEmpty()) {
                        perSlideTitle = i < titleBlocks.size() ? titleBlocks.get(i) : titleBlocks.get(0);
                    }

                    slideContent = request.getContent();
                    if (!legacyStructuredMode) {
                        List<Map<String, Object>> els = extractElementsFromLayoutJson(ts.getLayoutJson());
                        List<Map<String, Object>> textBoxes = els.stream()
                                .filter(e -> {
                                    String type = String.valueOf(e.getOrDefault("type", ""));
                                    return "text".equalsIgnoreCase(type) || "caption".equalsIgnoreCase(type);
                                })
                                .sorted((a, b) -> {
                                    double ay = toDouble(a.get("y"), 0);
                                    double by = toDouble(b.get("y"), 0);
                                    if (ay != by)
                                        return Double.compare(ay, by);
                                    double ax = toDouble(a.get("x"), 0);
                                    double bx = toDouble(b.get("x"), 0);
                                    return Double.compare(ax, bx);
                                })
                                .toList();

                        int needed = textBoxes.size();
                        if (needed <= 0) {
                            slideContent = "";
                        } else {
                            int end = Math.min(paragraphCursor + needed, legacyParagraphs.size());
                            if (paragraphCursor >= legacyParagraphs.size()) {
                                slideContent = "";
                            } else {
                                slideContent = String.join("\n\n", legacyParagraphs.subList(paragraphCursor, end));
                            }
                            paragraphCursor = end;
                        }
                    }
                }

                QuickCreateRequest perSlideReq = cloneQuickCreateRequestWithTitleAndContent(request, perSlideTitle,
                        slideContent);

                Slide slide = new Slide();
                slide.setPresentation(savedPresentation);
                slide.setSlideIndex(slideIndex++);
                slide.setLayoutUsed(ts);
                slide.setContentJson(generateContentJsonWithLayout(ts.getLayoutJson(), perSlideReq));
                slide.setLastModified(now);
                slideRepository.save(slide);
            }

            return PresentationResponse.builder()
                    .id(savedPresentation.getId())
                    .title(savedPresentation.getTitle())
                    .ownerUsername(owner.getUsername())
                    .editedDate(savedPresentation.getEditedDate())
                    .build();
        }

        // 1. CHỌN LAYOUT (request-provided OR mặc định)
        String requestLayoutJson = request.getLayoutJson();
        boolean hasRequestLayout = requestLayoutJson != null && !requestLayoutJson.trim().isEmpty();

        List<String> requestLayoutJsons = request.getLayoutJsons();
        boolean hasRequestLayoutJsons = requestLayoutJsons != null && !requestLayoutJsons.isEmpty()
                && requestLayoutJsons.stream().anyMatch(s -> s != null && !s.trim().isEmpty());
        if (hasRequestLayoutJsons) {
            requestLayoutJsons = requestLayoutJsons.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .toList();
        }

        TemplateSlide defaultLayout = null;
        if (!hasRequestLayout) {
            defaultLayout = templateSlideRepository.findById(1)
                    .orElseGet(() -> {
                        log.warn("Không tìm thấy TemplateSlide ID=1, sử dụng layout trống.");
                        TemplateSlide fallback = new TemplateSlide();
                        fallback.setLayoutJson("{\"elements\": []}");
                        return fallback;
                    });
        }

        int slideCount;
        if (hasPerSlideContents) {
            slideCount = contentBlocksNonEmpty.size();
        } else {
            slideCount = Math.max(hasPerSlideTitles ? titleBlocks.size() : 1, 1);
        }
        if (hasRequestLayoutJsons) {
            slideCount = Math.max(slideCount, requestLayoutJsons.size());
        }

        boolean legacyStructuredMode = isStructuredContent(request.getContent());
        List<String> legacyParagraphs = legacyStructuredMode ? List.of() : splitParagraphs(request.getContent());
        int paragraphCursor = 0;

        // 2. TẠO PRESENTATION MỚI
        Instant now = Instant.now();
        Presentation presentation = new Presentation();
        presentation.setOwner(owner);
        String presentationTitle = (hasPerSlideTitles && !titleBlocks.isEmpty()) ? titleBlocks.get(0)
                : request.getTitle();
        presentation.setTitle(presentationTitle);
        presentation.setCreatedAt(now);
        presentation.setEditedDate(now);
        Presentation savedPresentation = presentationRepository.save(presentation);

        // 3. TẠO SLIDE (1 hoặc nhiều)
        for (int i = 0; i < slideCount; i++) {
            String perSlideTitle = request.getTitle();
            String perSlideContent = request.getContent();

            if (hasPerSlideContents) {
                String rawBlock = i < contentBlocksNonEmpty.size() ? contentBlocksNonEmpty.get(i) : "";
                TitleAndBody parsed = parseTitleAndBodyFromBlock(rawBlock);
                if (parsed.title != null && !parsed.title.isBlank()) {
                    perSlideTitle = parsed.title;
                }
                perSlideContent = parsed.body;
            } else if (hasPerSlideTitles && !titleBlocks.isEmpty()) {
                perSlideTitle = i < titleBlocks.size() ? titleBlocks.get(i) : titleBlocks.get(0);
            }

            String layoutJsonForSlide = requestLayoutJson;
            if (hasRequestLayoutJsons) {
                int idx = Math.min(i, requestLayoutJsons.size() - 1);
                layoutJsonForSlide = requestLayoutJsons.get(idx);
            }

            if (!hasPerSlideContents && slideCount > 1 && !legacyStructuredMode) {
                // Khi user không tách content theo slide, chia đoạn theo số ô text/caption của
                // từng slide layout.
                String lj = (hasRequestLayoutJsons || hasRequestLayout) ? layoutJsonForSlide
                        : (defaultLayout != null ? defaultLayout.getLayoutJson() : null);
                int needed = countTextBoxesInLayoutJson(lj);
                if (needed <= 0) {
                    perSlideContent = "";
                } else {
                    int end = Math.min(paragraphCursor + needed, legacyParagraphs.size());
                    if (paragraphCursor >= legacyParagraphs.size()) {
                        perSlideContent = "";
                    } else {
                        perSlideContent = String.join("\n\n", legacyParagraphs.subList(paragraphCursor, end));
                    }
                    paragraphCursor = end;
                }
            }

            QuickCreateRequest perSlideReq = cloneQuickCreateRequestWithTitleAndContent(request, perSlideTitle,
                    perSlideContent);

            Slide slide = new Slide();
            slide.setPresentation(savedPresentation);
            slide.setSlideIndex(i + 1);

            if ((hasRequestLayoutJsons || hasRequestLayout) && layoutJsonForSlide != null
                    && !layoutJsonForSlide.trim().isEmpty()) {
                slide.setLayoutUsed(null);
                slide.setContentJson(generateContentJsonWithLayout(layoutJsonForSlide, perSlideReq));
            } else {
                slide.setLayoutUsed(defaultLayout);
                String contentJson = generateContentJsonWithLayout(defaultLayout.getLayoutJson(), perSlideReq);
                slide.setContentJson(contentJson);
            }

            slideRepository.save(slide);
        }

        // historyLogService.logAction("QUICK_CREATE", "PRESENTATION",
        // savedPresentation.getId(), currentUserId);

        return PresentationResponse.builder()
                .id(savedPresentation.getId())
                .title(savedPresentation.getTitle())
                .ownerUsername(owner.getUsername())
                .editedDate(savedPresentation.getEditedDate())
                .build();
    }

    private int countTextBoxesInLayoutJson(String layoutJson) {
        if (layoutJson == null || layoutJson.isBlank())
            return 0;
        List<Map<String, Object>> els = extractElementsFromLayoutJson(layoutJson);
        if (els == null || els.isEmpty())
            return 0;
        int count = 0;
        for (Map<String, Object> e : els) {
            String type = String.valueOf(e.getOrDefault("type", ""));
            if ("text".equalsIgnoreCase(type) || "caption".equalsIgnoreCase(type))
                count++;
        }
        return count;
    }

    /**
     * Parse 1 block slide dạng:
     * - Dòng đầu tiên (non-empty) là title.
     * - Các dòng còn lại là body (giữ nguyên, trim tổng thể).
     */
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
        String bodyStr = body.toString().trim();
        return new TitleAndBody(title, bodyStr);
    }

    private QuickCreateRequest cloneQuickCreateRequestWithTitleAndContent(QuickCreateRequest src, String title,
            String content) {
        QuickCreateRequest out = new QuickCreateRequest();
        out.setSubject(src.getSubject());
        out.setLesson(src.getLesson());
        out.setTitle(title);
        out.setContent(content == null ? "" : content);
        out.setLayoutJson(src.getLayoutJson());
        out.setTemplateId(src.getTemplateId());
        return out;
    }

    private List<Map<String, Object>> extractElementsFromLayoutJson(String layoutJson) {
        if (layoutJson == null || layoutJson.trim().isEmpty())
            return List.of();
        try {
            Map<String, Object> root = objectMapper.readValue(layoutJson, Map.class);
            Object elementsObj = root.get("elements");
            if (elementsObj instanceof List<?> list) {
                return list.stream()
                        .filter(it -> it instanceof Map)
                        .map(it -> (Map<String, Object>) it)
                        .toList();
            }
            return List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    // --- 2. Thêm Slide Mới (No. 7 - Nút +) ---
    @Transactional
    public Slide addNewSlideToPresentation(Integer projectId, Integer currentUserId) {

        Presentation presentation = presentationRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Dự án không tồn tại: " + projectId));

        // Kiểm tra quyền: Chỉ Owner mới được thêm Slide
        if (!presentation.getOwner().getId().equals(currentUserId)) {
            throw new SecurityException("Không có quyền thêm Slide vào dự án này.");
        }

        // Xác định Slide Index mới (INDEX = SLIDE_COUNT + 1)
        Integer currentSlideCount = slideRepository.countByPresentationIdOrderBySlideIndexAsc(projectId);
        int newIndex = (int) currentSlideCount + 1;

        // Lấy Layout Template Mặc định
        TemplateSlide defaultLayout = templateSlideRepository.findById(1)
                .orElseGet(() -> {
                    TemplateSlide fallback = new TemplateSlide();
                    fallback.setLayoutJson("{\"elements\": []}");
                    return fallback;
                });

        // Tạo Slide Entity mới
        Slide newSlide = new Slide();
        newSlide.setPresentation(presentation);
        newSlide.setSlideIndex(newIndex);
        newSlide.setLayoutUsed(defaultLayout);
        newSlide.setContentJson(createEmptyContentJson(defaultLayout.getLayoutJson()));
        newSlide.setLastModified(Instant.now());

        Slide savedSlide = slideRepository.save(newSlide);

        presentation.setEditedDate(Instant.now());
        presentationRepository.save(presentation);

        return savedSlide;
    }

    // --- 2b. Load slides for a presentation (Editor) ---
    @Transactional(readOnly = true)
    public List<SlideResponse> getSlidesByPresentation(Integer projectId, Integer currentUserId) {
        Presentation presentation = presentationRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Dự án không tồn tại: " + projectId));

        if (!presentation.getOwner().getId().equals(currentUserId)) {
            throw new SecurityException("Không có quyền xem Slide của dự án này.");
        }

        return slideRepository.findByPresentationIdOrderBySlideIndexAsc(projectId)
                .stream()
                .map(s -> SlideResponse.builder()
                        .id(s.getId())
                        .slideIndex(s.getSlideIndex())
                        .contentJson(s.getContentJson())
                        .build())
                .toList();
    }

    // --- 3. Cập nhật nội dung Slide (No. 7 - Nút Lưu ⑦) ---
    @Transactional
    public Slide updateSlideContent(Integer slideId, SlideUpdateRequest request, Integer currentUserId) {
        Slide slide = slideRepository.findById(slideId)
                .orElseThrow(() -> new ResourceNotFoundException("Slide không tồn tại: " + slideId));

        Presentation presentation = slide.getPresentation();

        // Kiểm tra quyền
        if (!presentation.getOwner().getId().equals(currentUserId)) {
            throw new SecurityException("Không có quyền chỉnh sửa Slide này.");
        }

        // Nếu frontend gửi contentJson đầy đủ (ví dụ đã chỉnh layout), ưu tiên dùng
        // trực tiếp.
        if (request.getUpdatedContentJson() != null && !request.getUpdatedContentJson().trim().isEmpty()) {
            slide.setContentJson(request.getUpdatedContentJson());
        } else {
            // Ngược lại chỉ cập nhật title/content vào JSON hiện có (hỗ trợ cả legacy và
            // dạng {layout/template,data}).
            String newContentJson = updateJsonWithTitleAndContent(slide.getContentJson(), request.getTitle(),
                    request.getContent());
            slide.setContentJson(newContentJson);
        }
        slide.setLastModified(Instant.now());

        presentation.setEditedDate(Instant.now());
        presentationRepository.save(presentation);

        // historyLogService.logAction("UPDATE_SLIDE", "SLIDE", slideId, currentUserId);
        return slideRepository.save(slide);
    }

    // --- 4. Xóa Slide (No. 7 - Điều khiển Slide ⑤) ---
    @Transactional
    public void deleteSlideAndReindex(Integer slideId, Integer currentUserId) {
        Slide slideToDelete = slideRepository.findById(slideId)
                .orElseThrow(() -> new ResourceNotFoundException("Slide không tồn tại: " + slideId));

        Presentation presentation = slideToDelete.getPresentation();

        if (!presentation.getOwner().getId().equals(currentUserId)) {
            throw new SecurityException("Không có quyền xóa Slide này.");
        }

        Integer deletedIndex = slideToDelete.getSlideIndex();

        // Xóa Slide
        slideRepository.delete(slideToDelete);

        // Tái lập chỉ mục (re-index) các slide còn lại
        List<Slide> slides = slideRepository.findByPresentationIdOrderBySlideIndexAsc(presentation.getId());
        for (Slide slide : slides) {
            if (slide.getSlideIndex() > deletedIndex) {
                slide.setSlideIndex(slide.getSlideIndex() - 1);
                slideRepository.save(slide);
            }
        }

        // historyLogService.logAction("DELETE_SLIDE", "SLIDE", slideId, currentUserId);
    }

    // --- 5. Logic Export File (No. 8) ---
    public Resource generateExportFile(Integer projectId, SaveExportRequest request, Integer currentUserId) {

        Presentation presentation = presentationRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Dự án không tồn tại."));

        if (!presentation.getOwner().getId().equals(currentUserId)) {
            throw new SecurityException("Không có quyền xuất file dự án này.");
        }

        String format = request.getFormats().get(0).toUpperCase(Locale.ROOT);

        String fontFamily = request.getFont() != null && !request.getFont().trim().isEmpty()
                ? request.getFont().trim()
                : "Noto Sans JP";

        if ("PPTX".equals(format)) {
            try (org.apache.poi.xslf.usermodel.XMLSlideShow ppt = new org.apache.poi.xslf.usermodel.XMLSlideShow()) {
                java.awt.Dimension pg = ppt.getPageSize();
                double slideW = pg.getWidth();
                double slideH = pg.getHeight();
                double scaleX = slideW / EDITOR_CANVAS_W;
                double scaleY = slideH / EDITOR_CANVAS_H;

                List<Slide> slides = slideRepository.findByPresentationIdOrderBySlideIndexAsc(projectId);

                for (Slide slide : slides) {
                    org.apache.poi.xslf.usermodel.XSLFSlide pptSlide = ppt.createSlide();

                    Map<String, Object> data = new java.util.HashMap<>(extractDataMap(slide.getContentJson()));
                    String title = asString(
                            data.getOrDefault("title", data.getOrDefault("name", presentation.getTitle())));
                    String content = asString(data.getOrDefault("content", ""));

                    // Nếu slide có layout đã lưu (từ editor) thì render theo danh sách elements
                    // trong JSON.
                    List<Map<String, Object>> elements = extractElements(slide.getContentJson());
                    if (elements.isEmpty()) {
                        // Fallback: nếu không có layout thì xuất theo kiểu đơn giản (title + content).
                        org.apache.poi.xslf.usermodel.XSLFTextBox titleBox = pptSlide.createTextBox();
                        titleBox.setAnchor(new java.awt.Rectangle(40, 30, 880, 80));
                        org.apache.poi.xslf.usermodel.XSLFTextParagraph p1 = titleBox.addNewTextParagraph();
                        org.apache.poi.xslf.usermodel.XSLFTextRun r1 = p1.addNewTextRun();
                        r1.setText(title);
                        r1.setFontFamily(fontFamily);
                        r1.setFontSize(32.0);
                        r1.setBold(true);

                        org.apache.poi.xslf.usermodel.XSLFTextBox contentBox = pptSlide.createTextBox();
                        contentBox.setAnchor(new java.awt.Rectangle(40, 130, 880, 390));
                        org.apache.poi.xslf.usermodel.XSLFTextParagraph p2 = contentBox.addNewTextParagraph();
                        org.apache.poi.xslf.usermodel.XSLFTextRun r2 = p2.addNewTextRun();
                        r2.setText(content);
                        r2.setFontFamily(fontFamily);
                        r2.setFontSize(18.0);
                        continue;
                    }

                    List<String> paragraphs = splitParagraphs(content);
                    int paragraphIndex = 0;

                    StructuredContent structured = null;
                    boolean structuredMode = isStructuredContent(content);
                    if (structuredMode) {
                        structured = parseStructuredContent(content);
                        if (structured != null && !structured.dates.isEmpty()) {
                            String firstDate = asString(structured.dates.get(0));
                            if (!firstDate.isBlank() && asString(data.get("date")).isBlank()) {
                                data.put("date", firstDate);
                            }
                        }
                    }

                    java.util.Map<String, Integer> slotCounters = new java.util.HashMap<>();

                    for (Map<String, Object> el : elements) {
                        String type = asString(el.get("type")).trim().toLowerCase();
                        int slotIndex = toSlotIndex(el.get("slotIndex"));
                        if (slotIndex <= 0) {
                            slotIndex = slotCounters.getOrDefault(type, 0) + 1;
                        }
                        slotCounters.put(type, Math.max(slotCounters.getOrDefault(type, 0), slotIndex));

                        double x = numberOr(el.get("x"), 40.0);
                        double y = numberOr(el.get("y"), 40.0);
                        double w = numberOr(el.get("w"), 320.0);
                        double h = numberOr(el.get("h"), 80.0);

                        java.awt.geom.Rectangle2D anchor = new java.awt.geom.Rectangle2D.Double(
                                clampDouble(x * scaleX, 0, slideW),
                                clampDouble(y * scaleY, 0, slideH),
                                clampDouble(w * scaleX, 10, slideW),
                                clampDouble(h * scaleY, 10, slideH));

                        if ("image".equals(type)) {
                            // Hỗ trợ tối thiểu: xuất placeholder dạng text cho khung ảnh.
                            org.apache.poi.xslf.usermodel.XSLFTextBox box = pptSlide.createTextBox();
                            box.setAnchor(anchor);
                            box.setVerticalAlignment(org.apache.poi.sl.usermodel.VerticalAlignment.MIDDLE);
                            org.apache.poi.xslf.usermodel.XSLFTextParagraph p = box.addNewTextParagraph();
                            p.setTextAlign(org.apache.poi.sl.usermodel.TextParagraph.TextAlign.CENTER);
                            org.apache.poi.xslf.usermodel.XSLFTextRun r = p.addNewTextRun();
                            String img = structuredMode && structured != null
                                    ? structured.getAt(structured.images, slotIndex)
                                    : resolveElementText(el, data, "Ảnh");
                            r.setText((img == null || img.isBlank()) ? "[Ảnh]" : img);
                            r.setFontFamily(fontFamily);
                            r.setBold(true);
                            continue;
                        }

                        String resolved;
                        if ("title".equals(type)) {
                            resolved = title;
                        } else if ("text".equals(type) || "caption".equals(type)) {
                            if (structuredMode && structured != null) {
                                java.util.List<String> list = "caption".equals(type) ? structured.captions
                                        : structured.texts;
                                resolved = structured.getAt(list, slotIndex);
                            } else {
                                resolved = paragraphIndex < paragraphs.size() ? paragraphs.get(paragraphIndex++) : "";
                            }
                        } else if ("date".equals(type)) {
                            if (structuredMode && structured != null) {
                                resolved = structured.getAt(structured.dates, slotIndex);
                                if (resolved == null || resolved.isBlank()) {
                                    resolved = java.time.LocalDate.now().toString();
                                }
                            } else {
                                resolved = java.time.LocalDate.now().toString();
                            }
                        } else {
                            // Các loại khác (variable/...) lấy từ el.text và resolve theo data.
                            resolved = resolveElementText(el, data, "");
                        }

                        org.apache.poi.xslf.usermodel.XSLFTextBox box = pptSlide.createTextBox();
                        box.setAnchor(anchor);
                        box.setVerticalAlignment(org.apache.poi.sl.usermodel.VerticalAlignment.MIDDLE);

                        org.apache.poi.xslf.usermodel.XSLFTextParagraph p = box.addNewTextParagraph();
                        applyParagraphAlign(p, el);
                        org.apache.poi.xslf.usermodel.XSLFTextRun r = p.addNewTextRun();
                        r.setText(resolved);
                        applyRunStyle(r, el, fontFamily);
                    }
                }

                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                ppt.write(baos);
                return new ByteArrayResource(baos.toByteArray());
            } catch (Exception e) {
                log.error("Failed to generate PPTX export", e);
                throw new IllegalArgumentException("Xuất PPTX thất bại.");
            }
        }

        if ("PDF".equals(format)) {
            try {
                List<Slide> slides = slideRepository.findByPresentationIdOrderBySlideIndexAsc(projectId);
                byte[] pdf = generatePdfExport(presentation, slides, fontFamily);
                return new ByteArrayResource(pdf);
            } catch (Exception e) {
                log.error("Failed to generate PDF export", e);
                String msg = e.getMessage();
                throw new IllegalArgumentException(
                        "Xuất PDF thất bại" + (msg == null || msg.isBlank() ? "." : ": " + msg));
            }
        }

        if ("PNG".equals(format)) {
            try {
                List<Slide> slides = slideRepository.findByPresentationIdOrderBySlideIndexAsc(projectId);
                byte[] zip = generatePngZipExport(presentation, slides, fontFamily);
                return new ByteArrayResource(zip);
            } catch (Exception e) {
                log.error("Failed to generate PNG export", e);
                throw new IllegalArgumentException("Xuất PNG thất bại.");
            }
        }

        throw new IllegalArgumentException("Định dạng xuất chưa được hỗ trợ: " + format);
    }

    private byte[] generatePngZipExport(Presentation presentation, List<Slide> slides, String fontFamily)
            throws IOException {
        int width = (int) EDITOR_CANVAS_W;
        int height = (int) EDITOR_CANVAS_H;

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {
            int i = 1;
            for (Slide slide : slides) {
                BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g = image.createGraphics();
                try {
                    g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    g.setColor(Color.WHITE);
                    g.fillRect(0, 0, width, height);

                    Map<String, Object> data = new java.util.HashMap<>(extractDataMap(slide.getContentJson()));
                    String title = asString(
                            data.getOrDefault("title", data.getOrDefault("name", presentation.getTitle())));
                    String content = asString(data.getOrDefault("content", ""));

                    List<Map<String, Object>> elements = extractElements(slide.getContentJson());
                    if (elements.isEmpty()) {
                        // Layout fallback tối thiểu (title + text) nếu thiếu elements.
                        elements = List.of(
                                Map.of("id", 1, "type", "title", "x", 40, "y", 40, "w", 720, "h", 90,
                                        "style",
                                        Map.of("fontSize", 40, "bold", true, "italic", false, "underline", false,
                                                "align", "left", "color", "#111827", "fontFamily", fontFamily)),
                                Map.of("id", 2, "type", "text", "x", 40, "y", 150, "w", 720, "h", 360,
                                        "style", Map.of("fontSize", 18, "bold", false, "italic", false, "underline",
                                                false, "align", "left", "color", "#111827", "fontFamily", fontFamily)));
                    }

                    List<String> paragraphs = splitParagraphs(content);
                    int paragraphIndex = 0;

                    StructuredContent structured = null;
                    boolean structuredMode = isStructuredContent(content);
                    if (structuredMode) {
                        structured = parseStructuredContent(content);
                        if (structured != null && !structured.dates.isEmpty()) {
                            String firstDate = asString(structured.dates.get(0));
                            if (!firstDate.isBlank() && asString(data.get("date")).isBlank()) {
                                data.put("date", firstDate);
                            }
                        }
                    }

                    java.util.Map<Integer, Integer> slotIndexByElementId = buildSlotIndexByElementId(elements);

                    // Sắp xếp thứ tự render cố định (trên->dưới, trái->phải)
                    ArrayList<Map<String, Object>> ordered = new ArrayList<>(elements);
                    ordered.sort((a, b) -> {
                        double ay = toDouble(a.get("y"), 0);
                        double by = toDouble(b.get("y"), 0);
                        if (ay != by)
                            return Double.compare(ay, by);
                        double ax = toDouble(a.get("x"), 0);
                        double bx = toDouble(b.get("x"), 0);
                        return Double.compare(ax, bx);
                    });

                    for (Map<String, Object> el : ordered) {
                        String type = asString(el.get("type")).toLowerCase(Locale.ROOT);
                        int x = (int) Math.round(toDouble(el.get("x"), 0));
                        int y = (int) Math.round(toDouble(el.get("y"), 0));
                        int w = (int) Math.round(toDouble(el.get("w"), 0));
                        int h = (int) Math.round(toDouble(el.get("h"), 0));
                        Map<String, Object> style = (el.get("style") instanceof Map<?, ?> m) ? (Map<String, Object>) m
                                : Map.of();

                        int slotIndex = slotIndexByElementId.getOrDefault(toInt(el.get("id"), -1),
                                toSlotIndex(el.get("slotIndex")));

                        String text;
                        if ("title".equals(type)) {
                            text = title;
                        } else if ("text".equals(type) || "caption".equals(type)) {
                            if (structuredMode && structured != null) {
                                java.util.List<String> list = "caption".equals(type) ? structured.captions
                                        : structured.texts;
                                text = structured.getAt(list, slotIndex);
                            } else {
                                text = paragraphIndex < paragraphs.size() ? paragraphs.get(paragraphIndex++) : "";
                            }
                        } else if ("date".equals(type)) {
                            if (structuredMode && structured != null) {
                                text = structured.getAt(structured.dates, slotIndex);
                                if (text == null || text.isBlank()) {
                                    text = java.time.LocalDate.now().toString();
                                }
                            } else {
                                text = java.time.LocalDate.now().toString();
                            }
                        } else if ("image".equals(type)) {
                            if (structuredMode && structured != null) {
                                String img = structured.getAt(structured.images, slotIndex);
                                text = (img == null || img.isBlank()) ? "[Ảnh]" : img;
                            } else {
                                text = "[Ảnh]";
                            }
                        } else {
                            text = asString(el.get("text"));
                            if (text.contains("title"))
                                text = title;
                            if (text.contains("content"))
                                text = content;
                        }

                        renderElementToGraphics(g, x, y, w, h, text, style, fontFamily);
                    }
                } finally {
                    g.dispose();
                }

                ByteArrayOutputStream pngOut = new ByteArrayOutputStream();
                ImageIO.write(image, "png", pngOut);

                ZipEntry entry = new ZipEntry(String.format("slide-%03d.png", i++));
                zos.putNextEntry(entry);
                zos.write(pngOut.toByteArray());
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    private byte[] generatePdfExport(Presentation presentation, List<Slide> slides, String fontFamily)
            throws IOException {
        float width = (float) EDITOR_CANVAS_W;
        float height = (float) EDITOR_CANVAS_H;

        try (PDDocument doc = new PDDocument()) {
            PDFont latinFont = resolvePdfLatinFont(doc, fontFamily);
            PDFont cjkFont = resolvePdfCjkFont(doc);

            for (Slide slide : slides) {
                PDPage page = new PDPage(new PDRectangle(width, height));
                doc.addPage(page);

                Map<String, Object> data = new java.util.HashMap<>(extractDataMap(slide.getContentJson()));
                String title = asString(data.getOrDefault("title", data.getOrDefault("name", presentation.getTitle())));
                String content = asString(data.getOrDefault("content", ""));

                List<Map<String, Object>> elements = extractElements(slide.getContentJson());
                if (elements.isEmpty()) {
                    elements = List.of(
                            Map.of("id", 1, "type", "title", "x", 40, "y", 40, "w", 720, "h", 90,
                                    "style",
                                    Map.of("fontSize", 40, "bold", true, "italic", false, "underline", false, "align",
                                            "left", "color", "#111827", "fontFamily", fontFamily)),
                            Map.of("id", 2, "type", "text", "x", 40, "y", 150, "w", 720, "h", 360,
                                    "style", Map.of("fontSize", 18, "bold", false, "italic", false, "underline", false,
                                            "align", "left", "color", "#111827", "fontFamily", fontFamily)));
                }

                List<String> paragraphs = splitParagraphs(content);
                int paragraphIndex = 0;

                StructuredContent structured = null;
                boolean structuredMode = isStructuredContent(content);
                if (structuredMode) {
                    structured = parseStructuredContent(content);
                    if (structured != null && !structured.dates.isEmpty()) {
                        String firstDate = asString(structured.dates.get(0));
                        if (!firstDate.isBlank() && asString(data.get("date")).isBlank()) {
                            data.put("date", firstDate);
                        }
                    }
                }

                java.util.Map<Integer, Integer> slotIndexByElementId = buildSlotIndexByElementId(elements);

                ArrayList<Map<String, Object>> ordered = new ArrayList<>(elements);
                ordered.sort((a, b) -> {
                    double ay = toDouble(a.get("y"), 0);
                    double by = toDouble(b.get("y"), 0);
                    if (ay != by)
                        return Double.compare(ay, by);
                    double ax = toDouble(a.get("x"), 0);
                    double bx = toDouble(b.get("x"), 0);
                    return Double.compare(ax, bx);
                });

                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    // Nền trắng
                    cs.setNonStrokingColor(255, 255, 255);
                    cs.addRect(0, 0, width, height);
                    cs.fill();

                    for (Map<String, Object> el : ordered) {
                        String type = asString(el.get("type")).toLowerCase(Locale.ROOT);
                        float x = (float) toDouble(el.get("x"), 0);
                        float y = (float) toDouble(el.get("y"), 0);
                        float w = (float) toDouble(el.get("w"), 0);
                        float h = (float) toDouble(el.get("h"), 0);
                        Map<String, Object> style = (el.get("style") instanceof Map<?, ?> m) ? (Map<String, Object>) m
                                : Map.of();

                        int slotIndex = slotIndexByElementId.getOrDefault(toInt(el.get("id"), -1),
                                toSlotIndex(el.get("slotIndex")));

                        String text;
                        if ("title".equals(type)) {
                            text = title;
                        } else if ("text".equals(type) || "caption".equals(type)) {
                            if (structuredMode && structured != null) {
                                java.util.List<String> list = "caption".equals(type) ? structured.captions
                                        : structured.texts;
                                text = structured.getAt(list, slotIndex);
                            } else {
                                text = paragraphIndex < paragraphs.size() ? paragraphs.get(paragraphIndex++) : "";
                            }
                        } else if ("date".equals(type)) {
                            if (structuredMode && structured != null) {
                                text = structured.getAt(structured.dates, slotIndex);
                                if (text == null || text.isBlank()) {
                                    text = java.time.LocalDate.now().toString();
                                }
                            } else {
                                text = java.time.LocalDate.now().toString();
                            }
                        } else if ("image".equals(type)) {
                            if (structuredMode && structured != null) {
                                String img = structured.getAt(structured.images, slotIndex);
                                text = (img == null || img.isBlank()) ? "[Ảnh]" : img;
                            } else {
                                text = "[Ảnh]";
                            }
                        } else {
                            text = asString(el.get("text"));
                            if (text.contains("title"))
                                text = title;
                            if (text.contains("content"))
                                text = content;
                        }

                        PDFont font = selectPdfFontForText(text, latinFont, cjkFont);
                        renderElementToPdf(cs, font, x, y, w, h, text, style, height);
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private void renderElementToGraphics(Graphics2D g, int x, int y, int w, int h, String text,
            Map<String, Object> style, String defaultFontFamily) {
        Color color = parseColor(asString(style.getOrDefault("color", "#111827")));
        int fontSize = (int) Math.round(toDouble(style.getOrDefault("fontSize", 18), 18));
        boolean bold = toBoolean(style.get("bold"));
        boolean italic = toBoolean(style.get("italic"));
        String align = asString(style.getOrDefault("align", "left")).toLowerCase(Locale.ROOT);

        int awtStyle = (bold ? Font.BOLD : Font.PLAIN) | (italic ? Font.ITALIC : Font.PLAIN);
        String family = asString(style.getOrDefault("fontFamily", defaultFontFamily));
        Font font = new Font(family == null || family.isBlank() ? defaultFontFamily : family, awtStyle,
                Math.max(6, fontSize));

        g.setColor(new Color(0, 0, 0, 25));
        g.drawRect(x, y, Math.max(1, w), Math.max(1, h));

        g.setFont(font);
        g.setColor(color);

        int pad = 6;
        int innerW = Math.max(1, w - pad * 2);
        int innerH = Math.max(1, h - pad * 2);

        FontMetrics fm = g.getFontMetrics();
        java.util.List<String> lines = wrapText(text, fm, innerW);

        int lineH = fm.getHeight();
        int maxLines = Math.max(1, innerH / Math.max(1, lineH));
        int count = Math.min(lines.size(), maxLines);

        int startY = y + pad + fm.getAscent();
        for (int i = 0; i < count; i++) {
            String line = lines.get(i);
            int lineW = fm.stringWidth(line);
            int drawX = x + pad;
            if ("center".equals(align)) {
                drawX = x + pad + Math.max(0, (innerW - lineW) / 2);
            } else if ("right".equals(align)) {
                drawX = x + pad + Math.max(0, innerW - lineW);
            }
            int drawY = startY + i * lineH;
            g.drawString(line, drawX, drawY);
        }
    }

    private void renderElementToPdf(PDPageContentStream cs, PDFont font, float x, float yTop, float w, float h,
            String text, Map<String, Object> style, float pageHeight) throws IOException {
        String align = asString(style.getOrDefault("align", "left")).toLowerCase(Locale.ROOT);
        float fontSize = (float) Math.max(6, toDouble(style.getOrDefault("fontSize", 18), 18));
        Color color = parseColor(asString(style.getOrDefault("color", "#111827")));

        // Quy đổi toạ độ từ hệ trục top-left (editor) sang bottom-left (PDF)
        float y = pageHeight - (yTop + h);

        // Viền nhạt
        cs.setStrokingColor(230, 230, 230);
        cs.addRect(x, y, Math.max(1, w), Math.max(1, h));
        cs.stroke();

        float pad = 6f;
        float innerW = Math.max(1, w - pad * 2);
        float innerH = Math.max(1, h - pad * 2);

        java.util.List<String> lines = wrapTextPdf(text, font, fontSize, innerW);
        float lineH = fontSize * 1.2f;
        int maxLines = Math.max(1, (int) Math.floor(innerH / lineH));
        int count = Math.min(lines.size(), maxLines);

        cs.setNonStrokingColor(color.getRed(), color.getGreen(), color.getBlue());
        cs.setFont(font, fontSize);

        float startY = y + h - pad - fontSize; // vẽ từ phía trên trong khung

        for (int i = 0; i < count; i++) {
            String line = lines.get(i);
            float textW = safePdfTextWidth(font, line, fontSize);
            float tx = x + pad;
            if ("center".equals(align)) {
                tx = x + pad + Math.max(0, (innerW - textW) / 2f);
            } else if ("right".equals(align)) {
                tx = x + pad + Math.max(0, innerW - textW);
            }
            float ty = startY - i * lineH;

            cs.beginText();
            cs.newLineAtOffset(tx, ty);
            try {
                cs.showText(line);
            } catch (IllegalArgumentException ex) {
                cs.showText(sanitizePdfText(line));
            }
            cs.endText();
        }
    }

    private String sanitizePdfText(String s) {
        if (s == null)
            return "";
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= 32 && c <= 126) {
                out.append(c);
            } else {
                out.append('?');
            }
        }
        return out.toString();
    }

    private java.util.List<String> wrapText(String text, FontMetrics fm, int maxWidth) {
        String normalized = text == null ? "" : text.replace("\r\n", "\n");
        java.util.List<String> out = new java.util.ArrayList<>();
        for (String para : normalized.split("\n")) {
            String p = para == null ? "" : para;
            if (p.isBlank()) {
                out.add("");
                continue;
            }
            String[] words = p.split("\\s+");
            StringBuilder line = new StringBuilder();
            for (String word : words) {
                if (line.length() == 0) {
                    line.append(word);
                    continue;
                }
                String next = line + " " + word;
                if (fm.stringWidth(next) <= maxWidth) {
                    line.append(" ").append(word);
                } else {
                    out.add(line.toString());
                    line = new StringBuilder(word);
                }
            }
            if (line.length() > 0)
                out.add(line.toString());
        }
        return out;
    }

    private java.util.List<String> wrapTextPdf(String text, PDFont font, float fontSize, float maxWidth)
            throws IOException {
        String normalized = text == null ? "" : text.replace("\r\n", "\n");
        java.util.List<String> out = new java.util.ArrayList<>();
        for (String para : normalized.split("\n")) {
            String p = para == null ? "" : para;
            if (p.isBlank()) {
                out.add("");
                continue;
            }
            String[] words = p.split("\\s+");
            StringBuilder line = new StringBuilder();
            for (String word : words) {
                if (line.length() == 0) {
                    line.append(word);
                    continue;
                }
                String next = line + " " + word;
                float w = safePdfTextWidth(font, next, fontSize);
                if (w <= maxWidth) {
                    line.append(" ").append(word);
                } else {
                    out.add(line.toString());
                    line = new StringBuilder(word);
                }
            }
            if (line.length() > 0)
                out.add(line.toString());
        }
        return out;
    }

    private float safePdfTextWidth(PDFont font, String text, float fontSize) throws IOException {
        if (text == null || text.isEmpty())
            return 0f;
        try {
            return (font.getStringWidth(text) / 1000f) * fontSize;
        } catch (IllegalArgumentException ex) {
            String safe = sanitizePdfText(text);
            try {
                return (font.getStringWidth(safe) / 1000f) * fontSize;
            } catch (IllegalArgumentException ignored) {
                // Trường hợp xấu nhất: ước lượng độ rộng
                return safe.length() * (fontSize * 0.6f);
            }
        }
    }

    private double toDouble(Object v, double fallback) {
        if (v == null)
            return fallback;
        if (v instanceof Number n)
            return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return fallback;
        }
    }

    private boolean toBoolean(Object v) {
        if (v == null)
            return false;
        if (v instanceof Boolean b)
            return b;
        return "true".equalsIgnoreCase(String.valueOf(v));
    }

    private Color parseColor(String raw) {
        if (raw == null)
            return new Color(17, 24, 39);
        String s = raw.trim();
        if (s.startsWith("#"))
            s = s.substring(1);
        if (s.length() == 6) {
            try {
                int r = Integer.parseInt(s.substring(0, 2), 16);
                int g = Integer.parseInt(s.substring(2, 4), 16);
                int b = Integer.parseInt(s.substring(4, 6), 16);
                return new Color(r, g, b);
            } catch (Exception ignored) {
            }
        }
        return new Color(17, 24, 39);
    }

    private PDFont selectPdfFontForText(String text, PDFont latinFont, PDFont cjkFont) {
        if (containsCjk(text))
            return cjkFont;
        return latinFont;
    }

    private boolean containsCjk(String s) {
        if (s == null || s.isEmpty())
            return false;
        for (int i = 0; i < s.length();) {
            int cp = s.codePointAt(i);
            // Hiragana / Katakana / CJK / một số khối dấu câu tiếng Nhật phổ biến
            if ((cp >= 0x3040 && cp <= 0x309F) ||
                    (cp >= 0x30A0 && cp <= 0x30FF) ||
                    (cp >= 0x31F0 && cp <= 0x31FF) ||
                    (cp >= 0x3400 && cp <= 0x4DBF) ||
                    (cp >= 0x4E00 && cp <= 0x9FFF) ||
                    (cp >= 0x3000 && cp <= 0x303F) ||
                    (cp >= 0xFF66 && cp <= 0xFF9D)) {
                return true;
            }
            i += Character.charCount(cp);
        }
        return false;
    }

    private PDFont resolvePdfLatinFont(PDDocument doc, String preferredFamily) {
        // Ưu tiên font đóng gói kèm (portable): hỗ trợ tiếng Việt tốt.
        PDFont bundled = loadBundledPdfFont(doc,
                "/fonts/NotoSans-VF.ttf",
                "/fonts/NotoSans-Regular.ttf",
                "/fonts/DejaVuSans.ttf");
        if (bundled != null)
            return bundled;

        String preferredLower = preferredFamily == null ? "" : preferredFamily.toLowerCase(Locale.ROOT);
        java.util.List<String> paths = new java.util.ArrayList<>();
        if (preferredLower.contains("arial")) {
            paths.add("C:/Windows/Fonts/arial.ttf");
        }
        paths.add("C:/Windows/Fonts/arial.ttf");
        paths.add("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf");
        for (String p : paths) {
            try {
                File f = new File(p);
                if (!f.exists())
                    continue;
                return PDType0Font.load(doc, f);
            } catch (Exception ignored) {
            }
        }

        return PDType1Font.HELVETICA;
    }

    private PDFont resolvePdfCjkFont(PDDocument doc) {
        // Ưu tiên font đóng gói kèm (portable): hỗ trợ Hiragana/Katakana/Kanji.
        PDFont bundled = loadBundledPdfFont(doc,
                "/fonts/NotoSansJP-VF.ttf",
                "/fonts/NotoSansJP-Regular.ttf",
                "/fonts/NotoSansJP-Regular.otf");
        if (bundled != null)
            return bundled;

        // Fallback theo font hệ thống (best-effort).
        java.util.List<String> paths = java.util.List.of(
                "C:/Windows/Fonts/meiryo.ttf",
                "C:/Windows/Fonts/yugothm.ttc",
                "C:/Windows/Fonts/msgothic.ttc");
        for (String p : paths) {
            try {
                File f = new File(p);
                if (!f.exists())
                    continue;
                return PDType0Font.load(doc, f);
            } catch (Exception ignored) {
            }
        }

        return PDType1Font.HELVETICA;
    }

    private PDFont loadBundledPdfFont(PDDocument doc, String... resourcePaths) {
        if (resourcePaths == null)
            return null;
        for (String res : resourcePaths) {
            if (res == null || res.isBlank())
                continue;
            try (java.io.InputStream in = SlideService.class.getResourceAsStream(res)) {
                if (in == null)
                    continue;
                return PDType0Font.load(doc, in, true);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    /**
     * Tạo chuỗi JSON nội dung theo dạng "cũ" cho Quick Create.
     * Lưu ý: hàm này dùng {@link String#format} để ghép chuỗi trực tiếp, vì vậy chỉ
     * nên xem như phương án legacy/fallback.
     */
    private String generateContentJson(QuickCreateRequest request) {
        // Mockup: map các trường Quick Create vào JSON.
        return String.format("""
                {
                  "subject": "%s",
                  "lesson": "%s",
                  "title": "%s",
                  "content": "%s",
                  "type": "text-slide"
                }
                """, request.getSubject(), request.getLesson(), request.getTitle(), request.getContent());
    }

    /**
     * Tạo JSON nội dung rỗng khi thêm slide mới.
     * {@code layoutJson} được nhúng trực tiếp vào JSON nên cần là một JSON hợp lệ
     * (object) từ template.
     */
    private String createEmptyContentJson(String layoutJson) {
        return String.format("{\"layout\": %s, \"data\": {\"title\": \"新しいスライド\", \"content\": \"\"}}", layoutJson);
    }

    private String generateContentJsonWithLayout(String layoutJson, QuickCreateRequest request) {
        try {
            String dataJson = objectMapper.writeValueAsString(Map.of(
                    "subject", request.getSubject(),
                    "lesson", request.getLesson(),
                    "title", request.getTitle(),
                    "content", request.getContent(),
                    "type", "text-slide"));
            return String.format("{\"layout\": %s, \"data\": %s}", layoutJson, dataJson);
        } catch (Exception e) {
            // Nếu serialize thất bại thì fallback sang cách ghép chuỗi JSON kiểu cũ.
            log.warn("Failed to serialize quick-create content data; falling back to generateContentJson", e);
            return generateContentJson(request);
        }
    }

    /**
     * Cập nhật {@code title}/{@code content} vào chuỗi JSON hiện có.
     * - Ưu tiên cập nhật vào object lồng {@code data} nếu tồn tại.
     * - Nếu không có {@code data}, fallback sang dạng legacy (title/content ở
     * root).
     * - Nếu parse JSON thất bại, fallback cuối cùng là thay chuỗi theo kiểu mock
     * cũ.
     */
    private String updateJsonWithTitleAndContent(String existingJson, String title, String content) {
        if (existingJson == null || existingJson.trim().isEmpty()) {
            try {
                String dataJson = objectMapper.writeValueAsString(Map.of("title", title, "content", content));
                return String.format("{\"data\": %s}", dataJson);
            } catch (Exception e) {
                return existingJson;
            }
        }

        try {
            Map<String, Object> root = objectMapper.readValue(existingJson, Map.class);

            // Ưu tiên cập nhật vào object lồng `data` nếu có.
            Object dataObj = root.get("data");
            if (dataObj instanceof Map<?, ?> dataMapRaw) {
                Map<String, Object> dataMap = (Map<String, Object>) dataMapRaw;
                dataMap.put("title", title);
                dataMap.put("content", content);
                root.put("data", dataMap);
                return objectMapper.writeValueAsString(root);
            }

            // Legacy: title/content nằm trực tiếp ở root.
            root.put("title", title);
            root.put("content", content);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            // Fallback cuối cùng: thay chuỗi theo cách mock cũ.
            return existingJson.replace("新しいスライド", title)
                    .replace("\"content\": \"\"", "\"content\": \"" + content + "\"");
        }
    }

    private Map<String, Object> extractDataMap(String contentJson) {
        if (contentJson == null || contentJson.trim().isEmpty())
            return Map.of();
        try {
            Map<String, Object> root = objectMapper.readValue(contentJson, Map.class);
            Object dataObj = root.get("data");
            if (dataObj instanceof Map<?, ?> dataMapRaw) {
                return (Map<String, Object>) dataMapRaw;
            }
            return root;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String asString(Object v) {
        if (v == null)
            return "";
        return String.valueOf(v);
    }

    private List<Map<String, Object>> extractElements(String contentJson) {
        if (contentJson == null || contentJson.trim().isEmpty())
            return List.of();
        try {
            Map<String, Object> root = objectMapper.readValue(contentJson, Map.class);
            Object layoutObj = root.get("layout");
            if (!(layoutObj instanceof Map<?, ?>)) {
                layoutObj = root.get("template");
            }
            if (layoutObj instanceof Map<?, ?> layoutMapRaw) {
                Object elementsObj = ((Map<?, ?>) layoutMapRaw).get("elements");
                if (elementsObj instanceof List<?> list) {
                    return list.stream()
                            .filter(it -> it instanceof Map)
                            .map(it -> (Map<String, Object>) it)
                            .toList();
                }
            }
            return List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> splitParagraphs(String content) {
        if (content == null)
            return List.of();
        String normalized = content.replace("\r\n", "\n");
        // Chế độ cũ (legacy): tách thành các đoạn theo dòng trống.
        String[] parts = normalized.split("\\n\\s*\\n+");
        java.util.ArrayList<String> out = new java.util.ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
            if (!t.isEmpty())
                out.add(t);
        }
        return out;
    }

    /**
     * Tách string thành các block theo delimiter "---" để map 1 block -> 1 slide.
     * - Hỗ trợ dạng newline: \n---\n
     * - Và dạng inline: " ... --- ... "
     */
    private List<String> splitSlideBlocks(String raw, boolean dropEmpty) {
        if (raw == null)
            return List.of();
        String normalized = raw.replace("\r\n", "\n");
        if (normalized.isBlank())
            return List.of();

        String[] parts = normalized.split("\\n\\s*---\\s*\\n", -1);
        if (parts.length == 1 && normalized.contains("---")) {
            // Fallback: delimiter inline
            parts = normalized.split("\\s*---\\s*", -1);
        }

        java.util.ArrayList<String> out = new java.util.ArrayList<>();
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
        // Nếu toàn bộ rỗng thì trả về rỗng để không tạo slide thừa
        boolean anyNonEmpty = out.stream().anyMatch(s -> s != null && !s.isBlank());
        return anyNonEmpty ? out : List.of();
    }

    /**
     * Kết quả parse từ 1 field `content` duy nhất.
     * - Token tách section: "\\--" (Ảnh -> Caption -> Text -> Date)
     * - Token tách slot trong section: "\\-" (slot #1, slot #2, ...)
     */
    private static class StructuredContent {
        final java.util.List<String> images;
        final java.util.List<String> captions;
        final java.util.List<String> texts;
        final java.util.List<String> dates;

        StructuredContent(java.util.List<String> images, java.util.List<String> captions, java.util.List<String> texts,
                java.util.List<String> dates) {
            this.images = images;
            this.captions = captions;
            this.texts = texts;
            this.dates = dates;
        }

        /**
         * Lấy giá trị theo `slotIndex` (bắt đầu từ 1) trong `list`; nếu thiếu thì trả
         * về chuỗi rỗng.
         */
        String getAt(java.util.List<String> list, int slotIndex) {
            if (list == null || list.isEmpty())
                return "";
            if (slotIndex <= 0)
                return "";
            int idx = slotIndex - 1;
            return idx < list.size() ? String.valueOf(list.get(idx)) : "";
        }
    }

    /**
     * Nhận biết `content` có dùng token phân tách cấu trúc ("\\-" hoặc "\\--") hay
     * không.
     */
    private boolean isStructuredContent(String content) {
        if (content == null || content.isBlank())
            return false;
        String normalized = normalizeStructuredDelimiters(content);
        return normalized.contains("\\--") || normalized.contains("\\-");
    }

    /**
     * Parse `content` theo cấu trúc thành các list: Ảnh/Caption/Text/Date.
     * Nếu thiếu section/slot thì trả về list rỗng hoặc phần tử rỗng tương ứng.
     */
    private StructuredContent parseStructuredContent(String content) {
        String normalized = normalizeStructuredDelimiters(content);

        String[] sections = normalized.split(java.util.regex.Pattern.quote("\\--"), -1);
        java.util.List<String> images = splitItems(sections.length > 0 ? sections[0] : "");
        java.util.List<String> captions = splitItems(sections.length > 1 ? sections[1] : "");
        java.util.List<String> texts = splitItems(sections.length > 2 ? sections[2] : "");
        java.util.List<String> datesRaw = splitItems(sections.length > 3 ? sections[3] : "");
        java.util.List<String> dates = datesRaw.stream().map(this::normalizeDate).toList();

        return new StructuredContent(images, captions, texts, dates);
    }

    /**
     * Chuẩn hoá token phân tách cấu trúc trong input.
     * - Đổi CRLF -> LF
     * - Hỗ trợ người dùng gõ dạng escape ("\\\\--", "\\\\-") rồi quy về ("\\--",
     * "\\-")
     */
    private String normalizeStructuredDelimiters(String content) {
        String normalized = content == null ? "" : content;
        normalized = normalized.replace("\r\n", "\n");
        // Hỗ trợ người dùng gõ dạng double backslash rồi quy về token chuẩn.
        normalized = normalized.replace("\\\\--", "\\--");
        normalized = normalized.replace("\\\\-", "\\-");

        return normalized;
    }

    /**
     * Tách 1 section thành các slot theo "\\-".
     * Nếu có token, giữ cả phần rỗng để hỗ trợ “bỏ qua slot #1 nhưng vẫn điền slot
     * #2”.
     */
    private java.util.List<String> splitItems(String section) {
        if (section == null)
            return java.util.List.of();
        String s = section.trim();
        if (s.isEmpty())
            return java.util.List.of();

        if (section.contains("\\-")) {
            String[] parts = section.split(java.util.regex.Pattern.quote("\\-"), -1);
            java.util.ArrayList<String> out = new java.util.ArrayList<>();
            for (String p : parts)
                out.add(p == null ? "" : p.trim());
            return out;
        }

        return java.util.List.of(s);
    }

    /**
     * Chuẩn hoá ngày dạng `D/M/YYYY` thành `DD/MM/YYYY`. Nếu không khớp pattern thì
     * giữ nguyên.
     */
    private String normalizeDate(String raw) {
        String t = raw == null ? "" : raw.trim();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d{1,2})/(\\d{1,2})/(\\d{1,4})$").matcher(t);
        if (!m.find())
            return t;
        String dd = String.format("%02d", Integer.parseInt(m.group(1)));
        String mm = String.format("%02d", Integer.parseInt(m.group(2)));
        String yyyy = m.group(3);
        return dd + "/" + mm + "/" + yyyy;
    }

    private int toInt(Object v, int fallback) {
        if (v == null)
            return fallback;
        if (v instanceof Number n)
            return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (Exception e) {
            return fallback;
        }
    }

    private int toSlotIndex(Object v) {
        return (int) Math.round(numberOr(v, 0));
    }

    private java.util.Map<Integer, Integer> buildSlotIndexByElementId(
            java.util.List<java.util.Map<String, Object>> elements) {
        java.util.Map<Integer, Integer> slotById = new java.util.HashMap<>();
        java.util.Map<String, Integer> counters = new java.util.HashMap<>();
        for (java.util.Map<String, Object> el : elements) {
            String type = asString(el.get("type")).toLowerCase(java.util.Locale.ROOT);
            int id = toInt(el.get("id"), -1);
            if (id < 0)
                continue;

            int slotIndex = toSlotIndex(el.get("slotIndex"));
            if (slotIndex <= 0) {
                slotIndex = counters.getOrDefault(type, 0) + 1;
            }
            counters.put(type, Math.max(counters.getOrDefault(type, 0), slotIndex));
            slotById.put(id, slotIndex);
        }
        return slotById;
    }

    private double numberOr(Object v, double fallback) {
        if (v == null)
            return fallback;
        if (v instanceof Number n)
            return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return fallback;
        }
    }

    private double clampDouble(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }

    private void applyParagraphAlign(org.apache.poi.xslf.usermodel.XSLFTextParagraph p, Map<String, Object> el) {
        try {
            Object styleObj = el.get("style");
            if (!(styleObj instanceof Map<?, ?> style))
                return;
            String align = asString(((Map<?, ?>) style).get("align")).toLowerCase();
            if ("center".equals(align)) {
                p.setTextAlign(org.apache.poi.sl.usermodel.TextParagraph.TextAlign.CENTER);
            } else if ("right".equals(align)) {
                p.setTextAlign(org.apache.poi.sl.usermodel.TextParagraph.TextAlign.RIGHT);
            } else {
                p.setTextAlign(org.apache.poi.sl.usermodel.TextParagraph.TextAlign.LEFT);
            }
        } catch (Exception ignored) {
        }
    }

    private void applyRunStyle(org.apache.poi.xslf.usermodel.XSLFTextRun r, Map<String, Object> el,
            String defaultFontFamily) {
        try {
            Object styleObj = el.get("style");
            if (!(styleObj instanceof Map<?, ?> styleRaw)) {
                r.setFontFamily(defaultFontFamily);
                return;
            }
            Map<?, ?> style = (Map<?, ?>) styleRaw;

            String ff = asString(style.get("fontFamily"));
            if (ff == null || ff.isBlank())
                ff = defaultFontFamily;
            r.setFontFamily(ff);

            double fs = numberOr(style.get("fontSize"), 18.0);
            r.setFontSize(fs);

            r.setBold(Boolean.TRUE.equals(style.get("bold")));
            r.setItalic(Boolean.TRUE.equals(style.get("italic")));
            if (Boolean.TRUE.equals(style.get("underline"))) {
                r.setUnderlined(true);
            }

            String color = asString(style.get("color"));
            java.awt.Color c = parseHexColor(color);
            if (c != null)
                r.setFontColor(c);
        } catch (Exception ignored) {
            r.setFontFamily(defaultFontFamily);
        }
    }

    private java.awt.Color parseHexColor(String hex) {
        if (hex == null)
            return null;
        String h = hex.trim();
        if (h.startsWith("#"))
            h = h.substring(1);
        if (h.length() != 6)
            return null;
        try {
            int rgb = Integer.parseInt(h, 16);
            return new java.awt.Color((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF);
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveElementText(Map<String, Object> el, Map<String, Object> data, String fallback) {
        String raw = asString(el.get("text"));
        if (raw == null || raw.isBlank())
            raw = fallback;
        if (raw == null)
            raw = "";

        // Replace {{key}} with data[key]
        String out = raw;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}").matcher(out);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String key = m.group(1);
            String repl;
            if ("date".equalsIgnoreCase(key)) {
                Object dv = data.get("date");
                repl = (dv != null && !asString(dv).isBlank()) ? asString(dv) : java.time.LocalDate.now().toString();
            } else {
                repl = asString(data.get(key));
            }
            m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(repl));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}