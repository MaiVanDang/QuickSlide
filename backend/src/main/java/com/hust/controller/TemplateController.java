package com.hust.controller;

import com.hust.dto.request.CreateTemplateRequest;
import com.hust.dto.request.UpdateTemplateRequest;
import com.hust.dto.response.ErrorResponse;
import com.hust.dto.response.TemplateResponse;
import com.hust.service.TemplateService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.hust.entity.Template;
import java.util.List;

@RestController
@RequestMapping("/templates")
public class TemplateController {

    private final TemplateService templateService;

    public TemplateController(TemplateService templateService) {
        this.templateService = templateService;
    }

    @GetMapping
    public ResponseEntity<List<TemplateResponse>> getAllTemplates() {
        List<TemplateResponse> templates = templateService.getAllTemplates();
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTemplateById(@PathVariable Integer id) {
        try {
            TemplateResponse template = templateService.getTemplateById(id);
            return ResponseEntity.ok(template);
        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND.value()));
        }
    }
    @GetMapping("/recent")
    public ResponseEntity<List<TemplateResponse>> getRecentTemplates() {
        // Giả định TemplateService.getRecentTemplates() đã được định nghĩa đúng
        List<TemplateResponse> templates = templateService.getRecentTemplates();
        return ResponseEntity.ok(templates);
    }
    @PostMapping
    public ResponseEntity<?> createTemplate(@Valid @RequestBody CreateTemplateRequest request) {
        try {
            TemplateResponse response = templateService.createTemplate(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST.value()));
        }
    }
@PostMapping("/copy/{id}")
    public ResponseEntity<?> createTemplateFromCopy(@PathVariable Integer id) {
        try {
            Template newTemplate = templateService.createTemplateFromCopy(id);
            // Trả về đối tượng Template mới (bản sao) để Frontend chuyển hướng đến trang chỉnh sửa bản sao đó.
            return ResponseEntity.status(HttpStatus.CREATED).body(newTemplate);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Template nguồn không tồn tại")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND.value()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST.value()));
        }
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTemplate(@PathVariable Integer id, @Valid @RequestBody UpdateTemplateRequest request) {
        try {
            TemplateResponse response = templateService.updateTemplate(id, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Template not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND.value()));
            } else if (e.getMessage().contains("Access denied") || e.getMessage().contains("You are not the owner")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage(), HttpStatus.FORBIDDEN.value()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST.value()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTemplate(@PathVariable Integer id) {
        try {
            templateService.deleteTemplate(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            if (e.getMessage().contains("Template not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage(), HttpStatus.NOT_FOUND.value()));
            } else if (e.getMessage().contains("Access denied") || e.getMessage().contains("You are not the owner")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(e.getMessage(), HttpStatus.FORBIDDEN.value()));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST.value()));
        }
    }
}