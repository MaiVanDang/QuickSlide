package com.hust.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTemplateRequest {
    
    @Size(min = 3, max = 255, message = "Tên phải có từ 3 đến 255 ký tự")
    private String name;

    private String description;

    private String templateContent; // JSON string

    private Boolean isPublic;
}