package com.hust.dto.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;

// DTO trả về cho Frontend (No. 4, 5)
@Data
@Builder
public class TemplateResponse {
    private Long id;
    private String name;
    private String description;
    private String theme;
    private String ownerUsername;
    private String previewImageUrl;

    @JsonProperty("isPublic")
    private boolean isPublic;

    @JsonProperty("isOwner")
    private boolean isOwner; // Dùng để Frontend hiển thị nút Sửa/Xóa
    private Instant createdAt;

    private Instant editedAt;
}