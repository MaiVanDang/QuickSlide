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

    @PostMapping("/quick-create")
    public ResponseEntity<PresentationResponse> quickCreate(@Valid @RequestBody QuickCreateRequest request) {
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        PresentationResponse created = slideService.createQuickSlide(request, currentUserId);
        return ResponseEntity.status(201).body(created);
    }

    @PostMapping("/project/{projectId}")
    public ResponseEntity<SlideResponse> addNewSlide(@PathVariable Integer projectId) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        Slide newSlide = slideService.addNewSlideToPresentation(projectId, currentUserId);

        return ResponseEntity.status(201).body(SlideResponse.builder()
                .id(newSlide.getId())
                .slideIndex(newSlide.getSlideIndex())
                .contentJson(newSlide.getContentJson())
                .build());
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<SlideResponse>> getSlidesByProject(@PathVariable Integer projectId) {
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(slideService.getSlidesByPresentation(projectId, currentUserId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateSlideContent(
            @PathVariable Integer id, 
            @Valid @RequestBody SlideUpdateRequest request) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        slideService.updateSlideContent(id, request, currentUserId);
        
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSlide(@PathVariable Integer id) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        slideService.deleteSlideAndReindex(id, currentUserId);
        
        return ResponseEntity.noContent().build();
    }
}