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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TemplateService {

    private static final Logger logger = LoggerFactory.getLogger(TemplateService.class);

    private final TemplateRepository templateRepository;
    private final UserRepository userRepository;

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
                .orElseThrow(() -> new RuntimeException("Template not found or access denied"));
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
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        if (!template.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }

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
        Template template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));

        if (!template.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Access denied");
        }

        templateRepository.delete(template);
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
