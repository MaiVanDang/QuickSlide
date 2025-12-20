package com.hust.dto.response;

import lombok.Builder;
import lombok.Data;

// DTO trả về cho Settings.tsx khi tải màn hình
@Data
@Builder
public class UserSettingsResponse {
    private String language;
    private String theme;
    private String font;
    private String defaultSlideBackgroundColor;
    private Boolean autoSaveEnabled;
    
    // Có thể bao gồm cả các thiết lập khác
}