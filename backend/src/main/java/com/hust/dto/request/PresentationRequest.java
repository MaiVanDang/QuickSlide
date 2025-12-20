package com.hust.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

@Data
public class PresentationRequest {
    @NotBlank(message = "Presentation title is required")
    private String title;
    
    private String description;

    private Integer templateId;

    private List<String> formats;
    private String font; 
}