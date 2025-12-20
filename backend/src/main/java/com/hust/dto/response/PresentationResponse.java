package com.hust.dto.response;

import java.time.Instant;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PresentationResponse {
    private Integer id;
    private String title;
    private String ownerUsername; // Người tạo (④)
    private Instant editedDate; // Ngày chỉnh sửa (⑤)
    
    // Thêm các trường khác nếu cần (ví dụ: số lượng slides)
}