package com.hust.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class SaveExportRequest {
    
    @NotBlank(message = "ファイル名は必須です。")
    private String fileName; // Tên file (③)
    
    @NotEmpty(message = "少なくとも1つの形式を選択してください。")
    private List<String> formats; // Định dạng (PDF, PNG, PPTX) (②)
    
    private String font; // Font chữ (④)
}