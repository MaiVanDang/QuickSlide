package com.hust.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SlideResponse {
    private Integer id;
    private Integer slideIndex;
    private String contentJson;
}
