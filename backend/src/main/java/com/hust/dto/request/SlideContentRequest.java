package com.hust.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class SlideContentRequest {
    @NotBlank(message = "Slide ID is required")
    private Long slideId;
    
    private String title;
    private String content; // Nội dung slide
    private String layoutJson; // JSON chứa vị trí/style elements (nếu có)
}