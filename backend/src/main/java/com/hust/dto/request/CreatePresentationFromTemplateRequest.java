package com.hust.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePresentationFromTemplateRequest {

    @NotNull(message = "templateId は必須です。")
    private Long templateId;

    // Optional: if omitted, backend will use template name.
    private String title;
}
