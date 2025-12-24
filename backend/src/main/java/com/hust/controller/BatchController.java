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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/batch")
public class BatchController {

    @Autowired
    private BatchService batchService;

    // --- 1. POST /api/batch/upload (No. 6: Tải lên và Xem trước) ---
    @PostMapping("/upload")
    public ResponseEntity<List<SlideDataDTO>> uploadAndPreview(@RequestParam("file") MultipartFile file) {
        
        // Dữ liệu đầu vào: Tệp Excel/CSV (MultipartFile)
        Long currentUserId = SecurityUtil.getCurrentUserId();
        
        // Service đọc file, parse data, và trả về preview (Bảng ⑤)
        List<SlideDataDTO> previewData = batchService.parseFile(file, currentUserId);
        
        return ResponseEntity.ok(previewData); 
    }

    // --- 2. POST /api/batch/generate (No. 6: Tạo Slide Hàng Loạt) ---
    @PostMapping("/generate")
    public ResponseEntity<List<PresentationResponse>> generateSlides(@Valid @RequestBody BatchGenerateRequest request) {
        
        // Dữ liệu đầu vào: JSON chứa các dòng data đã được xem trước (Bảng ⑤)
        Long currentUserId = SecurityUtil.getCurrentUserId();
        
        // Service tạo 1 presentation cho mỗi dòng Excel
        BatchService.BatchGenerateResult result = batchService.createBatchSlides(request, currentUserId);

        // Return warnings via header (keeps body backward-compatible)
        List<String> warnings = result.getWarnings();
        if (warnings != null && !warnings.isEmpty()) {
            // NOTE: HTTP headers cannot contain CR/LF characters. Keep body backward-compatible.
            String joined = warnings.stream()
                    .filter(w -> w != null && !w.isBlank())
                    .map(w -> w.replace("\r", " ").replace("\n", " ").trim())
                    .filter(w -> !w.isBlank())
                    .collect(Collectors.joining(" | "));

            // Avoid overly large headers
            String safe = joined.length() > 1500 ? joined.substring(0, 1500) + "..." : joined;
            if (safe.isBlank()) {
                return ResponseEntity.ok(result.getCreated());
            }
            return ResponseEntity.ok()
                    .header("X-Batch-Warning", safe)
                    .body(result.getCreated());
        }

        return ResponseEntity.ok(result.getCreated());
    }
}