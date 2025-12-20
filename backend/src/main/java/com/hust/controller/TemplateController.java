package com.hust.controller;

import com.hust.dto.request.TemplateCreateRequest;
import com.hust.dto.response.TemplateResponse;
import com.hust.dto.response.TemplateSlideResponse;
import com.hust.service.TemplateService;
import com.hust.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/templates")
public class TemplateController {

    @Autowired
    private TemplateService templateService;

    // --- 1. GET /api/templates (No. 4: Template Library) ---
    @GetMapping
    public ResponseEntity<List<TemplateResponse>> getTemplates(
            @RequestParam(required = false, defaultValue = "public") String type) {

        Integer currentUserId = null;
        if ("mine".equalsIgnoreCase(type)) {
            currentUserId = SecurityUtil.getCurrentUserId();
        }

        List<TemplateResponse> templates = templateService.getTemplates(type, currentUserId);
        return ResponseEntity.ok(templates);
    }

    // --- 2. POST /api/templates (No. 5: Create New Template) ---
    @PostMapping
    public ResponseEntity<TemplateResponse> createTemplate(
            @Valid @RequestBody TemplateCreateRequest request) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        TemplateResponse newTemplate = templateService.createNewTemplate(request, currentUserId);
        return ResponseEntity.status(201).body(newTemplate);
    }

    // --- 3. DELETE /api/templates/{id} (No. 4: Xóa Template Tự tạo) ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Integer id) {
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        templateService.softDeleteTemplate(id, currentUserId);
        return ResponseEntity.noContent().build();
    }

    // --- 4. GET /api/templates/{id}/slides (For selecting a layout) ---
    @GetMapping("/{id}/slides")
    public ResponseEntity<List<TemplateSlideResponse>> getTemplateSlides(@PathVariable Integer id) {
        Integer currentUserId = null;
        try {
            currentUserId = SecurityUtil.getCurrentUserId();
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok(templateService.getTemplateSlides(id, currentUserId));
    }

    // --- 5. GET /api/templates/{id} (For editing template metadata) ---
    @GetMapping("/{id}")
    public ResponseEntity<TemplateResponse> getTemplateById(@PathVariable Integer id) {
        Integer currentUserId = null;
        try {
            currentUserId = SecurityUtil.getCurrentUserId();
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok(templateService.getTemplateById(id, currentUserId));
    }

    // --- 6. PUT /api/templates/{id} (Update template - owner only) ---
    @PutMapping("/{id}")
    public ResponseEntity<TemplateResponse> updateTemplate(
            @PathVariable Integer id,
            @Valid @RequestBody TemplateCreateRequest request) {
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        TemplateResponse updated = templateService.updateTemplate(id, request, currentUserId);
        return ResponseEntity.ok(updated);
    }
    
    // --- 4. PUT /api/templates/{id} - Update Template (Tương tự POST, cần thêm logic kiểm tra quyền) ---
}