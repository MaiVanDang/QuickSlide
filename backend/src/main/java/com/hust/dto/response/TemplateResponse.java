package com.hust.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TemplateResponse {
    
    private Integer id;
    private String name;
    private String description;
    private String templateContent;
    
    // User info (Khóa ngoại)
    private Integer userId;
    private String username; 

    // Timestamp
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isPublic;
}