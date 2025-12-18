package com.hust.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

@Data
public class PresentationRequest {
    @NotBlank(message = "Presentation title is required")
    private String title;
    
    private String description;
    
    // Sử dụng Template ID khi tạo từ Template
    private Long templateId; 
    
    // Cấu trúc Export (cho màn hình No. 8)
    private List<String> formats; // PDF, PNG, PPTX
    private String font; 
}