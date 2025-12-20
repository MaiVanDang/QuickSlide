package com.hust.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class SaveExportRequest {
    
    @NotBlank(message = "Tên file là bắt buộc.")
    private String fileName; // Tên file (③)
    
    @NotEmpty(message = "Phải chọn ít nhất một định dạng.")
    private List<String> formats; // Định dạng (PDF, PNG, PPTX) (②)
    
    private String font; // Font chữ (④)
}