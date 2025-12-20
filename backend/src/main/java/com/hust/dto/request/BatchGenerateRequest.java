package com.hust.dto.request;

import com.hust.dto.response.SlideDataDTO;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchGenerateRequest {
    
    @NotEmpty(message = "Danh sách slide không được trống.")
    private List<SlideDataDTO> slides;
    private Integer templateId;
    private Integer templateSlideId; 
}