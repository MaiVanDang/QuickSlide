package com.hust.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlideDataDTO {

    // Cột A: title (tên bài thuyết trình)
    private String name;

    // Cột B: slide_title (tiêu đề slide)
    private String slideTitle;

    // Cột C: slide_content (nội dung slide)
    private String content;

    @JsonProperty("isError")
    @JsonAlias({"error"})
    private boolean error;

    private String errorMessage;

    // Các cột khác (nếu có)
    @Builder.Default
    private Map<String, Object> additionalData = new HashMap<>();

    @JsonAnyGetter
    public Map<String, Object> getAdditionalData() {
        return additionalData;
    }

    @JsonAnySetter
    public void setAdditionalProperty(String key, Object value) {
        this.additionalData.put(key, value);
    }
}