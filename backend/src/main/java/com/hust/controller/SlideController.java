package com.hust.controller;

import com.hust.dto.request.QuickCreateRequest;
import com.hust.dto.request.SlideUpdateRequest;
import com.hust.dto.response.PresentationResponse;
import com.hust.dto.response.SlideResponse;
import com.hust.entity.Slide;
import com.hust.service.SlideService;
import com.hust.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/slides")
public class SlideController {

    @Autowired
    private SlideService slideService;

    // --- 0. POST /api/slides/quick-create (Quick Create) ---
    @PostMapping("/quick-create")
    public ResponseEntity<PresentationResponse> quickCreate(@Valid @RequestBody QuickCreateRequest request) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        PresentationResponse created = slideService.createQuickSlide(request, currentUserId);
        return ResponseEntity.status(201).body(created);
    }

    // --- 1. POST /api/slides/project/{projectId} (NEW: Thêm Slide Mới) ---
    @PostMapping("/project/{projectId}")
    public ResponseEntity<SlideResponse> addNewSlide(@PathVariable Long projectId) {
        
        Long currentUserId = SecurityUtil.getCurrentUserId();
        Slide newSlide = slideService.addNewSlideToPresentation(projectId, currentUserId);
        
        // Trả về Slide mới được tạo, Frontend sẽ thêm nó vào danh sách Thumbnails (③)
        return ResponseEntity.status(201).body(SlideResponse.builder()
                .id(newSlide.getId())
                .slideIndex(newSlide.getSlideIndex())
                .contentJson(newSlide.getContentJson())
                .build());
    }

    // --- 1b. GET /api/slides/project/{projectId} (Load slides for editor) ---
    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<SlideResponse>> getSlidesByProject(@PathVariable Long projectId) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(slideService.getSlidesByPresentation(projectId, currentUserId));
    }

    // --- 2. PUT /api/slides/{id} (No. 7: Nút Lưu ⑦) ---
    @PutMapping("/{id}")
    public ResponseEntity<Void> updateSlideContent(
            @PathVariable Long id, 
            @Valid @RequestBody SlideUpdateRequest request) {
        
        Long currentUserId = SecurityUtil.getCurrentUserId();
        slideService.updateSlideContent(id, request, currentUserId);
        
        return ResponseEntity.noContent().build();
    }
    
    // --- 3. DELETE /api/slides/{id} (No. 7: Xóa Slide) ---
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSlide(@PathVariable Long id) {
        
        Long currentUserId = SecurityUtil.getCurrentUserId();
        slideService.deleteSlideAndReindex(id, currentUserId);
        
        return ResponseEntity.noContent().build();
    }
}