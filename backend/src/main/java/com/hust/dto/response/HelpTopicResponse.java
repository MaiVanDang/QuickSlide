package com.hust.dto.response;

import lombok.Builder;
import lombok.Data;

// DTO trả về cho màn hình HelpCenter.tsx
@Data
@Builder
public class HelpTopicResponse {
    private Long id;
    private String title;       // Tên Chủ đề (No. 10 - ⑤)
    private String preview;     // Mô tả ngắn
    private String category;    // Danh mục (No. 10 - ④)
    private String contentHtml; // Nội dung chi tiết (nếu là endpoint chi tiết)
}