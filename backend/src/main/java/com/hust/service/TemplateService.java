package com.hust.service;

import com.hust.dto.request.CreateTemplateRequest;
import com.hust.dto.request.UpdateTemplateRequest;
import com.hust.dto.response.TemplateResponse;
import com.hust.entity.Template;
import com.hust.entity.User;
import com.hust.repository.TemplateRepository;
import com.hust.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired; // Cần thiết cho @Autowired
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

// Giả định các Exception này đã được định nghĩa
class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) { super(message); }
}

class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(String message) { super(message); }
}

@Service
public class TemplateService {

    private static final Logger logger = LoggerFactory.getLogger(TemplateService.class);

    @Autowired // ✅ Dùng Autowired hoặc Constructor Injection
    private final TemplateRepository templateRepository;
    
    @Autowired // ✅ Dùng Autowired hoặc Constructor Injection
    private final UserRepository userRepository;
    
    // Lưu ý: Nếu dùng @Autowired cho fields, bạn có thể xóa constructor
    public TemplateService(TemplateRepository templateRepository, UserRepository userRepository) {
        this.templateRepository = templateRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new RuntimeException("User not authenticated");
        }

        String userEmail = authentication.getName();
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> {
                    logger.error("Authenticated user not found in database for email: {}", userEmail);
                    return new RuntimeException("Authenticated user not found in database");
                });
    }

    private TemplateResponse mapToResponse(Template template) {
        return new TemplateResponse(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.getTemplateContent(),
                template.getUser().getId(),
                template.getUser().getUsername(),
                template.getCreatedAt(),
                template.getUpdatedAt(),
                template.getIsPublic()
        );
    }

    // --- CRUD Operations ---

    @Transactional
    public TemplateResponse createTemplate(CreateTemplateRequest request) {
        User currentUser = getCurrentUser();
        Template template = new Template(
                request.getName(),
                request.getDescription(),
                request.getTemplateContent(),
                currentUser,
                request.getIsPublic() != null ? request.getIsPublic() : false
        );
        return mapToResponse(templateRepository.save(template));
    }

    public TemplateResponse getTemplateById(Integer id) {
        User currentUser = getCurrentUser();
        Template template = templateRepository
                .findByIdAndIsPublicTrueOrIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found or access denied"));
        return mapToResponse(template);
    }

    public List<TemplateResponse> getAllTemplates() {
        User currentUser = getCurrentUser();
        List<Template> templates = templateRepository.findByIsPublicTrueOrUserId(currentUser.getId());
        return templates.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public TemplateResponse updateTemplate(Integer id, UpdateTemplateRequest request) {
        User currentUser = getCurrentUser();
        
        // SỬ DỤNG LOGIC PHÂN QUYỀN CHÍNH XÁC: Chỉ tìm template nếu người dùng là chủ sở hữu
        Template template = templateRepository.findByIdAndUser_Id(id, currentUser.getId())
                .orElseThrow(() -> {
                    // Nếu template không được tìm thấy qua truy vấn này, nó hoặc không tồn tại, hoặc người dùng không phải chủ sở hữu.
                    if (templateRepository.existsById(id)) {
                         throw new AccessDeniedException("Bạn không phải là chủ sở hữu Template này.");
                    }
                    throw new ResourceNotFoundException("Template không tồn tại.");
                });
        // ✅ Cập nhật chỉ khi đã xác minh quyền sở hữu

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setTemplateContent(request.getTemplateContent());
        if (request.getIsPublic() != null) {
            template.setIsPublic(request.getIsPublic());
        }

        return mapToResponse(templateRepository.save(template));
    }

    @Transactional
    public void deleteTemplate(Integer id) {
        User currentUser = getCurrentUser();
        Integer currentUserId = currentUser.getId();

        Optional<Template> templateOptional = templateRepository.findByIdAndUser_Id(id, currentUserId);

        if (templateOptional.isEmpty()) {
            // Nếu không tìm thấy, kiểm tra xem template có tồn tại không
            if (templateRepository.existsById(id)) {
                // Template tồn tại nhưng không thuộc sở hữu (có thể là public hoặc của người khác)
                throw new AccessDeniedException("Bạn không có quyền xóa Template này. Chỉ có thể xóa Template do bạn tự tạo.");
            } else {
                // Template không tồn tại
                throw new ResourceNotFoundException("Template không tồn tại.");
            }
        }

        Template templateToDelete = templateOptional.get();
        templateRepository.delete(templateToDelete);
    }
    
    // --- Logic Tạo Bản sao và Gần đây ---

    /**
     * Hàm tạo bản sao Template từ một nguồn khác (có thể là Public)
     */
    public Template createTemplateFromCopy(Integer sourceTemplateId) {
        User currentUser = getCurrentUser();
        
        // Dùng truy vấn cho phép lấy cả Public và của mình
        Optional<Template> sourceTemplate = templateRepository.findByIdAndIsPublicTrueOrIdAndUserId(sourceTemplateId, currentUser.getId());
        
        if (sourceTemplate.isEmpty()) {
            throw new ResourceNotFoundException("Template nguồn không tồn tại.");
        }
        
        Template original = sourceTemplate.get();
        
        // Tạo đối tượng Template MỚI
        Template newTemplate = new Template(
            original.getName() + " (Copy)",
            original.getDescription(),
            original.getTemplateContent(), 
            currentUser, 
            false // Mặc định bản sao là riêng tư
        );
        
        // Lưu bản sao vào database
        return templateRepository.save(newTemplate);
    }

    public List<TemplateResponse> getRecentTemplates() {
        User currentUser = getCurrentUser();
        PageRequest pageRequest = PageRequest.of(0, 6, Sort.by(Sort.Direction.DESC, "updatedAt"));
        
        List<Template> templates = templateRepository
                .findByIsPublicTrueOrUserId(currentUser.getId(), pageRequest)
                .getContent();
        
        return templates.stream().map(this::mapToResponse).collect(Collectors.toList());
    }
}