package com.hust.dto.request;

import com.hust.dto.response.SlideDataDTO;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchGenerateRequest {
    
    @NotEmpty(message = "スライド一覧は必須です。")
    private List<SlideDataDTO> slides; // Dữ liệu đã được Frontend xác nhận
    
    // Tùy chọn: ID của Template (deck) được chọn để áp dụng bố cục theo từng slide.
    private Long templateId;

    // Tùy chọn: ID của Template Slide được chọn để áp dụng bố cục
    private Long templateSlideId; 
}