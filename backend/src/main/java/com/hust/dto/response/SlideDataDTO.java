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
    private String name;    // Tên Slide từ cột title (cột A)
    private String content; // Nội dung từ cột description (cột B)

    @JsonProperty("isError")
    @JsonAlias({"error"})
    private boolean error;

    private String errorMessage;
    
    // Lưu trữ các cột động (value, price, category, v.v.)
    @Builder.Default
    private Map<String, Object> additionalData = new HashMap<>();
    
    // Serialize các field động ra JSON
    @JsonAnyGetter
    public Map<String, Object> getAdditionalData() {
        return additionalData;
    }
    
    // Deserialize các field động từ JSON
    @JsonAnySetter
    public void setAdditionalProperty(String key, Object value) {
        this.additionalData.put(key, value);
    }
}