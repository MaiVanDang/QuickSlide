package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class QuickCreateRequest {

    @NotBlank(message = "Tên môn học là bắt buộc.")
    private String subject;

    @NotBlank(message = "Buổi học là bắt buộc.")
    private String lesson;

    @NotBlank(message = "Tiêu đề là bắt buộc.")
    private String title;

    @NotBlank(message = "Nội dung là bắt buộc.")
    private String content;

    private Integer templateId;

    private String layoutJson;

    private List<String> layoutJsons;
}