package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateTemplateRequest {
    
    @NotBlank(message = "Tên template không được để trống")
    @Size(min = 3, max = 255, message = "Tên phải có từ 3 đến 255 ký tự")
    private String name;

    private String description;

    @NotBlank(message = "Nội dung template không được để trống")
    private String templateContent; // JSON string

    private Boolean isPublic = false;
}