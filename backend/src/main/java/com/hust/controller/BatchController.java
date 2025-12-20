package com.hust.controller;

import com.hust.dto.request.BatchGenerateRequest;
import com.hust.dto.response.PresentationResponse;
import com.hust.dto.response.SlideDataDTO;
import com.hust.service.BatchService;
import com.hust.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/batch")
public class BatchController {

    @Autowired
    private BatchService batchService;

    @PostMapping("/upload")
    public ResponseEntity<List<SlideDataDTO>> uploadAndPreview(@RequestParam("file") MultipartFile file) {
        

        Long currentUserId = SecurityUtil.getCurrentUserId();

        List<SlideDataDTO> previewData = batchService.parseFile(file, currentUserId);
        
        return ResponseEntity.ok(previewData); 
    }


    @PostMapping("/generate")
    public ResponseEntity<List<PresentationResponse>> generateSlides(@Valid @RequestBody BatchGenerateRequest request) {
        

        Long currentUserId = SecurityUtil.getCurrentUserId();
        

        BatchService.BatchGenerateResult result = batchService.createBatchSlides(request, currentUserId);


        List<String> warnings = result.getWarnings();
        if (warnings != null && !warnings.isEmpty()) {
            String joined = String.join("\n", warnings);

            String safe = joined.length() > 1500 ? joined.substring(0, 1500) + "..." : joined;
            return ResponseEntity.ok()
                    .header("X-Batch-Warning", safe)
                    .body(result.getCreated());
        }

        return ResponseEntity.ok(result.getCreated());
    }
}