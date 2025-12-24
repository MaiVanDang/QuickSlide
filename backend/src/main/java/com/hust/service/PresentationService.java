package com.hust.service;

import com.hust.dto.request.CreatePresentationFromTemplateRequest;
import com.hust.dto.response.PresentationResponse;
import com.hust.entity.Presentation;
import com.hust.entity.Slide;
import com.hust.entity.Template;
import com.hust.entity.TemplateSlide;
import com.hust.entity.User;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.PresentationRepository;
import com.hust.repository.SlideRepository;
import com.hust.repository.TemplateRepository;
import com.hust.repository.TemplateSlideRepository;
import com.hust.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PresentationService {

    @Autowired private PresentationRepository presentationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TemplateRepository templateRepository;
    @Autowired private TemplateSlideRepository templateSlideRepository;
    @Autowired private SlideRepository slideRepository;
    // @Autowired private HistoryLogService historyLogService;
    
    // --- 1. Lấy danh sách Dự án gần đây (No. 3 - Khu vực ⑨) ---
    public List<PresentationResponse> getRecentPresentations(Long currentUserId) {
        
        // [KHẮC PHỤC LỖI CRASH] Nếu User ID là NULL (chưa đăng nhập/token lỗi), trả về danh sách rỗng.
        // Việc này ngăn chặn NullPointerException xảy ra khi gọi repository.
        if (currentUserId == null) {
             return java.util.Collections.emptyList();
        }

        // BUSINESS RULE: Danh sách Dự án gần đây phải tải theo thứ tự Ngày chỉnh sửa giảm dần.
        List<Presentation> recentProjects = presentationRepository.findByOwnerIdOrderByEditedDateDesc(currentUserId);
        
        // Giới hạn số lượng trả về (ví dụ: 10 dự án gần nhất)
        List<Presentation> limitedProjects = recentProjects.stream().limit(10).collect(Collectors.toList());

        // Map Entity sang Response DTO
        return limitedProjects.stream()
                .map(this::toPresentationResponse)
                .collect(Collectors.toList());
    }
    
    // --- 2. Lấy chi tiết Dự án (Cho Editor/Mở từ Dashboard) ---
    public PresentationResponse getPresentationDetails(Long projectId, Long currentUserId) {
        
        Presentation project = presentationRepository.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("プロジェクトが存在しません: " + projectId));

        // BUSINESS RULE: Kiểm tra quyền truy cập.
        // Cần xử lý trường hợp currentUserId là null trước khi gọi hàm này
        if (currentUserId == null || !project.getOwner().getId().equals(currentUserId)) {
               throw new SecurityException("このプロジェクトにアクセスする権限がありません。");
        }
        
        return toPresentationResponse(project);
    }

    // --- 3. Tạo Presentation từ Template (Template là một deck nhiều slide) ---
    @Transactional
    public PresentationResponse createPresentationFromTemplate(CreatePresentationFromTemplateRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new com.hust.exception.UnauthorizedException("ログインしていません。");
        }

        User owner = userRepository.findById(currentUserId)
            .orElseThrow(() -> new ResourceNotFoundException("ユーザーが存在しません。"));

        Template template = templateRepository.findById(request.getTemplateId())
            .orElseThrow(() -> new ResourceNotFoundException("テンプレートが存在しません。"));

        // Template public ai cũng xem được; template private yêu cầu đúng owner.
        if (Boolean.FALSE.equals(template.getIsPublic())) {
            if (template.getOwner() == null || template.getOwner().getId() == null
                    || !template.getOwner().getId().equals(currentUserId)) {
                throw new com.hust.exception.UnauthorizedException("ログインしていません。");
            }
        }

        List<TemplateSlide> templateSlides = templateSlideRepository.findByTemplateIdOrderBySlideOrderAsc(template.getId());
        if (templateSlides == null || templateSlides.isEmpty()) {
            throw new IllegalArgumentException("このテンプレートにはスライドがありません。");
        }

        Instant now = Instant.now();
        Presentation presentation = new Presentation();
        presentation.setOwner(owner);
        presentation.setBasedOnTemplate(template);

        String title = request.getTitle();
        if (title == null || title.isBlank()) {
            title = template.getName();
        }
        presentation.setTitle(title);
        presentation.setCreatedAt(now);
        presentation.setEditedDate(now);

        Presentation savedPresentation = presentationRepository.save(presentation);

        int index = 1;
        for (TemplateSlide ts : templateSlides) {
            Slide slide = new Slide();
            slide.setPresentation(savedPresentation);
            slide.setSlideIndex(index++);
            slide.setLayoutUsed(ts);
            slide.setContentJson(createEmptyContentJson(ts.getLayoutJson()));
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
    
    // --- Helper Mapper ---
    private PresentationResponse toPresentationResponse(Presentation p) {
        return PresentationResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .ownerUsername(p.getOwner().getUsername()) // Người tạo (④)
                .editedDate(p.getEditedDate())             // Ngày chỉnh sửa (⑤)
                .build();
    }

    private String createEmptyContentJson(String layoutJson) {
        String safeLayout = (layoutJson != null && !layoutJson.isBlank())
                ? layoutJson
                : "{\"elements\": []}";
        return String.format("{\"layout\": %s, \"data\": {\"title\": \"新しいスライド\", \"content\": \"\"}}", safeLayout);
    }
    
    // --- Phương thức MOCKUP cho Logout (cần thiết cho Header) ---
    public void processLogout(Long currentUserId) {
        // Trong hệ thống JWT Stateless, Logout chủ yếu là client side (xóa token).
        // Nếu có refresh token hoặc log activity, logic sẽ được đặt ở đây.
        // historyLogService.logAction("LOGOUT", "USER", currentUserId, currentUserId);
    }
}