package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SlideUpdateRequest {
    
    // Tiêu đề/Nội dung có thể được chỉnh sửa trực tiếp (No. 7 - ④)
    @NotBlank(message = "スライドのタイトルは必須です。")
    private String title; 
    
    @NotBlank(message = "スライドの内容は必須です。")
    private String content; 
    
    // Nếu có các trường thuộc tính/vị trí mới được chỉnh sửa, sẽ được gửi kèm trong JSON này.
    private String updatedContentJson; // Partial JSON update cho các Element
}