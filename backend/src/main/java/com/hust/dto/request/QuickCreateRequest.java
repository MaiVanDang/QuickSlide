package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

// DTO đầu vào cho việc tạo slide tự động
@Data
public class QuickCreateRequest {

    @NotBlank(message = "科目は必須です。")
    private String subject; // 科目名 (③)

    @NotBlank(message = "授業回は必須です。")
    private String lesson; // 授業 (④)

    @NotBlank(message = "タイトルは必須です。")
    private String title; // タイトル (⑤)

    @NotBlank(message = "内容は必須です。")
    private String content; // 内容 (⑥)

    // Optional: if provided, backend will use all slides from this template (a deck)
    // to create a multi-slide presentation and import content into each slide.
    private Long templateId;

    // Optional: layout JSON from Quick Create layout step or selected template slide
    private String layoutJson;

    // Optional: multiple layout JSONs for multi-slide custom layouts (no templateId).
    private List<String> layoutJsons;
}