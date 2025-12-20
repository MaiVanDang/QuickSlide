package com.hust.dto.response;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ErrorResponse {

    private int status;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant timestamp;
    private String message;
    private String details;
}
