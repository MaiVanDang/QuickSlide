package com.hust.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HelpTopicResponse {
    private Integer id;
    private String title;
    private String preview;
    private String category;
    private String contentHtml;
}