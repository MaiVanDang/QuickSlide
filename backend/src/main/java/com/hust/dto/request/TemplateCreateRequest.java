package com.hust.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

// DTO cho việc tạo hoặc cập nhật Template (No. 5)
@Data
public class TemplateCreateRequest {

    @NotBlank(message = "テンプレート名は必須です。")
    private String name;

    private String description;

    // Theme identifier (e.g. "blue", "green", "purple"). Optional.
    private String theme;

    // Optional thumbnail to show in Template Library cards.
    // Can be a URL or a data URL (base64).
    private String previewImageUrl;
    
    private List<TemplateSlideRequest> slides; // Danh sách các slide mẫu

    @Data
    public static class TemplateSlideRequest {
        @NotBlank(message = "レイアウトJSONは必須です。")
        private String layoutJson; // Cấu trúc JSON chi tiết Element
        private Integer order;
    }
}