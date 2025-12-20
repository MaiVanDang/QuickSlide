package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

// DTO gửi từ Settings.tsx khi người dùng nhấn Lưu
@Data
public class UserSettingsRequest {

    // Lựa chọn Ngôn ngữ (ja, en, vi)
    @NotBlank(message = "Ngôn ngữ là bắt buộc.")
    private String language; 

    // Giao diện (light, dark)
    @NotBlank(message = "Theme là bắt buộc.")
    private String theme; 

    // Font chữ
    @NotBlank(message = "Font là bắt buộc.")
    private String font; 

    // Màu nền mặc định cho slide/editor (ví dụ: #ffffff)
    private String defaultSlideBackgroundColor; 
    
    // Các cài đặt khác (ví dụ: tự động lưu, thông báo)
    private Boolean autoSaveEnabled;
}