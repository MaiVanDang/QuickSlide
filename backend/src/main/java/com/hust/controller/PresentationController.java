package com.hust.controller;

import com.hust.dto.request.CreatePresentationFromTemplateRequest;
import com.hust.dto.response.PresentationResponse;
import com.hust.service.PresentationService;
import com.hust.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.hust.dto.request.SaveExportRequest; // <--- KHẮC PHỤC LỖI SaveExportRequest
import com.hust.service.SlideService;         // <--- KHẮC PHỤC LỖI SlideService
import org.springframework.core.io.Resource;   // <--- KHẮC PHỤC LỖI Resource
import jakarta.validation.Valid;               // <--- KHẮC PHỤC LỖI Valid
import java.util.List;

import org.springframework.http.HttpHeaders; 
import org.springframework.http.MediaType;
@RestController
@RequestMapping("/presentations")
public class PresentationController {

    @Autowired private PresentationService presentationService;
    @Autowired private SlideService slideService;

    // --- 1. GET /api/presentations/recents (No. 3: Dashboard) ---
    @GetMapping("/recents")
    public ResponseEntity<List<PresentationResponse>> getRecentProjects() {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId(); // Lấy ID User từ Security Context
        List<PresentationResponse> projects = presentationService.getRecentPresentations(currentUserId);
        
        return ResponseEntity.ok(projects);
    }

    // --- 2. GET /api/presentations/{id} (Mở Dự án từ Dashboard hoặc truy cập trực tiếp) ---
    @GetMapping("/{id}")
    public ResponseEntity<PresentationResponse> getProjectDetails(@PathVariable Integer id) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        PresentationResponse project = presentationService.getPresentationDetails(id, currentUserId);
        
        return ResponseEntity.ok(project);
    }

    // --- 3. POST /api/presentations/from-template (Tạo dự án từ Template deck) ---
    @PostMapping("/from-template")
    public ResponseEntity<PresentationResponse> createFromTemplate(
            @Valid @RequestBody CreatePresentationFromTemplateRequest request) {
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        PresentationResponse created = presentationService.createPresentationFromTemplate(request, currentUserId);
        return ResponseEntity.status(201).body(created);
    }

    // --- Cần thêm các Endpoint cho Export/Save (No. 8) sau ---
    @PostMapping("/{id}/export")
    public ResponseEntity<Resource> exportPresentation(
            @PathVariable Integer id, 
            @Valid @RequestBody SaveExportRequest request) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        Resource fileResource = slideService.generateExportFile(id, request, currentUserId);
        
        // BUSINESS RULE: Tên file (③) phải được điền và Format (②) phải được chọn.
        String format = request.getFormats().get(0).toLowerCase(); 
        String fileName = request.getFileName();

        String downloadExt = format;

        MediaType contentType = MediaType.APPLICATION_OCTET_STREAM;
        if ("pptx".equals(format)) {
            contentType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation");
        } else if ("pdf".equals(format)) {
            contentType = MediaType.APPLICATION_PDF;
        } else if ("png".equals(format)) {
            // PNG export returns a ZIP containing one PNG per slide.
            contentType = MediaType.parseMediaType("application/zip");
            downloadExt = "zip";
        }

        return ResponseEntity.ok()
                // Cần set Content Type phù hợp (ví dụ: application/pdf)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "." + downloadExt + "\"")
            .contentType(contentType)
                .body(fileResource);
    }
}