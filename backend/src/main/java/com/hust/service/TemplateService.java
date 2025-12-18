package com.hust.service;

import com.hust.dto.request.TemplateCreateRequest;
import com.hust.dto.response.TemplateResponse;
import com.hust.entity.Template;
import com.hust.entity.TemplateSlide;
import com.hust.entity.User;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.TemplateRepository;
import com.hust.repository.TemplateSlideRepository;
import com.hust.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class TemplateService {

    @Autowired private TemplateRepository templateRepository;
    @Autowired private TemplateSlideRepository templateSlideRepository;
    @Autowired private UserRepository userRepository;
    // @Autowired private HistoryLogService historyLogService; // Giả định HistoryLogService

    // --- 1. Xem Thư viện (No. 4) ---
    @Transactional(readOnly = true)
    public List<TemplateResponse> getTemplates(String type, Long currentUserId) {
        List<Template> templates;

        if ("mine".equalsIgnoreCase(type)) {
            if (currentUserId == null) {
                throw new com.hust.exception.UnauthorizedException("Chưa đăng nhập");
            }
            templates = templateRepository.findMineTemplatesOrderByRecency(currentUserId);
        } else if ("public".equalsIgnoreCase(type)) {
            templates = templateRepository.findPublicTemplatesOrderByRecency();
        } else {
            // Trường hợp lỗi/mặc định, trả về public
            templates = templateRepository.findPublicTemplatesOrderByRecency();
        }

        // Map Entity sang Response DTO và kiểm tra quyền sở hữu
        return templates.stream()
                .map(t -> toTemplateResponse(t, currentUserId))
                .collect(Collectors.toList());
    }

    // --- 2. Tạo Template Mới (No. 5) ---
    @Transactional
    public TemplateResponse createNewTemplate(TemplateCreateRequest request, Long currentUserId) {
        // Lấy User từ DB để thiết lập Owner
        User owner = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại. Lỗi xác thực JWT."));

        Template template = new Template();
        template.setTheme(request.getTheme() == null || request.getTheme().isBlank() ? "default" : request.getTheme().trim());
        template.setName(request.getName());
        template.setOwner(owner);
        Instant now = Instant.now();
        template.setCreatedAt(now);
        template.setEditedAt(now);
        template.setIsPublic(true); 
        template.setIsDeleted(false);
        if (request.getPreviewImageUrl() != null && !request.getPreviewImageUrl().isBlank()) {
            template.setPreviewImageUrl(request.getPreviewImageUrl().trim());
        } else {
            template.setPreviewImageUrl(generatePreviewDataUrl(template.getTheme(), template.getName()));
        }
        
        Template savedTemplate = templateRepository.save(template);
        
        // Lưu các Slide mẫu (layoutJson)
        if (request.getSlides() != null && !request.getSlides().isEmpty()) {
            request.getSlides().forEach(slideReq -> {
                TemplateSlide slide = new TemplateSlide();
                slide.setTemplate(savedTemplate);
                slide.setLayoutJson(slideReq.getLayoutJson());
                slide.setSlideOrder(slideReq.getOrder() != null ? slideReq.getOrder() : 0);
                templateSlideRepository.save(slide);
            });
        }
        
        // historyLogService.logAction("CREATE_TEMPLATE", "TEMPLATE", savedTemplate.getId(), currentUserId);
        return toTemplateResponse(savedTemplate, currentUserId);
    }

    // --- 2b. Lấy 1 template (để sửa) ---
    @Transactional(readOnly = true)
    public TemplateResponse getTemplateById(Long templateId, Long currentUserId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template không tồn tại."));

        // Template public ai cũng xem được; template private yêu cầu đúng owner.
        if (Boolean.FALSE.equals(template.getIsPublic())) {
            if (currentUserId == null || template.getOwner() == null || template.getOwner().getId() == null
                    || !template.getOwner().getId().equals(currentUserId)) {
                throw new com.hust.exception.UnauthorizedException("Chưa đăng nhập");
            }
        }

        return toTemplateResponse(template, currentUserId);
    }

    // --- 2c. Cập nhật template (chỉ owner) ---
    @Transactional
    public TemplateResponse updateTemplate(Long templateId, TemplateCreateRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new com.hust.exception.UnauthorizedException("Chưa đăng nhập");
        }

        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template không tồn tại."));

        if (template.getOwner() == null || template.getOwner().getId() == null
                || !template.getOwner().getId().equals(currentUserId)) {
            throw new SecurityException("Bạn không có quyền sửa Template này.");
        }

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setTheme(request.getTheme() == null || request.getTheme().isBlank() ? "default" : request.getTheme().trim());
        template.setEditedAt(Instant.now());
        if (request.getPreviewImageUrl() != null && !request.getPreviewImageUrl().isBlank()) {
            template.setPreviewImageUrl(request.getPreviewImageUrl().trim());
        } else {
            template.setPreviewImageUrl(generatePreviewDataUrl(template.getTheme(), template.getName()));
        }

        Template savedTemplate = templateRepository.save(template);

        // Thay toàn bộ danh sách slide mẫu
        templateSlideRepository.deleteByTemplateId(templateId);
        if (request.getSlides() != null && !request.getSlides().isEmpty()) {
            request.getSlides().forEach(slideReq -> {
                TemplateSlide slide = new TemplateSlide();
                slide.setTemplate(savedTemplate);
                slide.setLayoutJson(slideReq.getLayoutJson());
                slide.setSlideOrder(slideReq.getOrder() != null ? slideReq.getOrder() : 0);
                templateSlideRepository.save(slide);
            });
        }

        return toTemplateResponse(savedTemplate, currentUserId);
    }
    
    // --- 3. Xóa Mềm Template (No. 4) ---
    @Transactional
    public void softDeleteTemplate(Long templateId, Long currentUserId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template không tồn tại."));

        // Kiểm tra quyền: Chỉ Owner mới được xóa mềm
        if (!template.getOwner().getId().equals(currentUserId)) {
            // Ném SecurityException (sẽ được GlobalExceptionHandler bắt và trả về 400 Bad Request)
            throw new SecurityException("Bạn không có quyền xóa Template này.");
        }
        
        template.setIsDeleted(true); 
        templateRepository.save(template);

        // historyLogService.logAction("SOFT_DELETE_TEMPLATE", "TEMPLATE", templateId, currentUserId);
        log.info("Template {} soft deleted by User {}", templateId, currentUserId);
    }

    // --- 4. Lấy danh sách slide của template (để chọn layout) ---
    @Transactional(readOnly = true)
    public List<com.hust.dto.response.TemplateSlideResponse> getTemplateSlides(Long templateId, Long currentUserId) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template không tồn tại."));

        // Template public ai cũng xem được; template private yêu cầu đúng owner.
        if (Boolean.FALSE.equals(template.getIsPublic())) {
            if (currentUserId == null || template.getOwner() == null || template.getOwner().getId() == null
                    || !template.getOwner().getId().equals(currentUserId)) {
                throw new com.hust.exception.UnauthorizedException("Chưa đăng nhập");
            }
        }

        return templateSlideRepository.findByTemplateIdOrderBySlideOrderAsc(templateId)
                .stream()
                .map(s -> com.hust.dto.response.TemplateSlideResponse.builder()
                        .id(s.getId())
                        .layoutJson(s.getLayoutJson())
                        .order(s.getSlideOrder())
                        .build())
                .collect(Collectors.toList());
    }

    // --- Helper Mapper ---
    private TemplateResponse toTemplateResponse(Template t, Long currentUserId) {
        // Kiểm tra quyền sở hữu để Frontend biết có nên hiển thị nút Sửa/Xóa hay không
        boolean isOwner = currentUserId != null
            && t.getOwner() != null
            && t.getOwner().getId() != null
            && t.getOwner().getId().equals(currentUserId);

    String preview = t.getPreviewImageUrl();
    // Tương thích ngược: template cũ chưa có preview hoặc preview SVG placeholder đời cũ
    // (có chữ lớn dễ bị tràn) -> luôn trả về SVG placeholder mới, gọn.
    if (preview == null || preview.isBlank() || isLegacyGeneratedSvgPreview(preview)) {
        preview = generatePreviewDataUrl(t.getTheme(), t.getName());
    }

        String ownerUsername = (t.getOwner() != null && t.getOwner().getUsername() != null)
            ? t.getOwner().getUsername()
            : "unknown";

        return TemplateResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .description(t.getDescription())
                .theme(t.getTheme())
            .ownerUsername(ownerUsername)
                                .previewImageUrl(preview)
                .isPublic(t.getIsPublic())
                .isOwner(isOwner)
                .createdAt(t.getCreatedAt())
            .editedAt(t.getEditedAt() != null ? t.getEditedAt() : t.getCreatedAt())
                .build();
    }

    private boolean isLegacyGeneratedSvgPreview(String preview) {
        if (preview == null) return false;
        String prefix = "data:image/svg+xml;base64,";
        if (!preview.startsWith(prefix)) return false;
        try {
            String encoded = preview.substring(prefix.length());
            byte[] decoded = Base64.getDecoder().decode(encoded);
            String svg = new String(decoded, StandardCharsets.UTF_8);
            // Placeholder đời cũ thường chứa <text> và/hoặc label "Theme:".
            return svg.contains("<text") || svg.contains("Theme:");
        } catch (Exception ignored) {
            return false;
        }
    }

    private String generatePreviewDataUrl(String themeRaw, String titleRaw) {
        String theme = (themeRaw == null || themeRaw.isBlank()) ? "default" : themeRaw.trim().toLowerCase();

        // Bảng màu đơn giản theo theme (SVG gradients)
        String[] colors = switch (theme) {
            case "business" -> new String[]{"#0F172A", "#334155"};
            case "education" -> new String[]{"#14532D", "#22C55E"};
            case "creative" -> new String[]{"#4C1D95", "#A855F7"};
            case "green" -> new String[]{"#14532D", "#22C55E"};
            case "purple" -> new String[]{"#4C1D95", "#A855F7"};
            case "blue", "default" -> new String[]{"#1D4ED8", "#60A5FA"};
            default -> new String[]{"#1D4ED8", "#60A5FA"};
        };

        // Thumbnail không có chữ để phần overlay tên template trong UI dễ đọc.
        // 800x450 cho tỉ lệ đẹp hơn trên nhiều kích thước card.
        String svg = """
            <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"450\" viewBox=\"0 0 800 450\">
              <defs>
                <linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">
                                    <stop offset=\"0%%\" stop-color=\"%s\"/>
                                    <stop offset=\"100%%\" stop-color=\"%s\"/>
                </linearGradient>
                <linearGradient id=\"shine\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">
                                    <stop offset=\"0%%\" stop-color=\"rgba(255,255,255,0.00)\"/>
                                    <stop offset=\"50%%\" stop-color=\"rgba(255,255,255,0.18)\"/>
                                    <stop offset=\"100%%\" stop-color=\"rgba(255,255,255,0.00)\"/>
                </linearGradient>
              </defs>
              <rect width=\"800\" height=\"450\" fill=\"url(#g)\"/>
              <rect x=\"-120\" y=\"40\" width=\"380\" height=\"520\" transform=\"rotate(-12 0 0)\" fill=\"rgba(255,255,255,0.10)\"/>
              <rect x=\"520\" y=\"-120\" width=\"420\" height=\"560\" transform=\"rotate(18 800 0)\" fill=\"rgba(255,255,255,0.08)\"/>
              <rect x=\"0\" y=\"0\" width=\"800\" height=\"450\" fill=\"url(#shine)\"/>
              <rect x=\"40\" y=\"60\" width=\"720\" height=\"330\" rx=\"24\" fill=\"rgba(0,0,0,0.10)\"/>
              <rect x=\"58\" y=\"84\" width=\"420\" height=\"64\" rx=\"14\" fill=\"rgba(255,255,255,0.16)\"/>
              <rect x=\"58\" y=\"164\" width=\"580\" height=\"30\" rx=\"10\" fill=\"rgba(255,255,255,0.14)\"/>
              <rect x=\"58\" y=\"206\" width=\"540\" height=\"30\" rx=\"10\" fill=\"rgba(255,255,255,0.12)\"/>
              <rect x=\"58\" y=\"248\" width=\"500\" height=\"30\" rx=\"10\" fill=\"rgba(255,255,255,0.10)\"/>
              <rect x=\"58\" y=\"304\" width=\"260\" height=\"60\" rx=\"14\" fill=\"rgba(255,255,255,0.10)\"/>
              <rect x=\"340\" y=\"304\" width=\"220\" height=\"60\" rx=\"14\" fill=\"rgba(255,255,255,0.08)\"/>
            </svg>
            """.formatted(colors[0], colors[1]);

        String base64 = Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8));
        return "data:image/svg+xml;base64," + base64;
    }

    private String escapeXml(String s) {
        return s
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }
}