package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

// DTO gửi từ Settings.tsx khi người dùng nhấn Lưu
@Data
public class UserSettingsRequest {

    // Lựa chọn Ngôn ngữ (ja, en, vi)
    @NotBlank(message = "言語は必須です。")
    private String language; 

    // Giao diện (light, dark)
    @NotBlank(message = "テーマは必須です。")
    private String theme; 

    // Font chữ
    @NotBlank(message = "フォントは必須です。")
    private String font; 

    // Màu nền mặc định cho slide/editor (ví dụ: #ffffff)
    private String defaultSlideBackgroundColor; 
    
    // Các cài đặt khác (ví dụ: tự động lưu, thông báo)
    private Boolean autoSaveEnabled;
}