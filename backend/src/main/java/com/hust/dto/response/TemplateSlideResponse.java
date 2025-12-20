package com.hust.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TemplateSlideResponse {
    private Long id;
    private String layoutJson;
    private Integer order;
}
