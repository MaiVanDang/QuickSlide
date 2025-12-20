package com.hust.dto.request;

import lombok.Data;

@Data
public class PlaceholderRequest {
    private Integer slideId;
    private String type;
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private Integer zIndex;
    private String properties;
}
