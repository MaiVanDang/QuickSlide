package com.hust.dto.response;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlideDataDTO {
    private String name;    // Tên Slide từ cột 1 (Bảng ⑤)
    private String content; // Nội dung từ cột 2 (Bảng ⑤)

    // Note: JSON uses `isError`, but JavaBeans boolean naming would otherwise expose it as `error`.
    // Keep JSON stable for the frontend.
    @JsonProperty("isError")
    @JsonAlias({"error"})
    private boolean error; // Dùng để highlight dòng lỗi trên UI

    private String errorMessage;
}