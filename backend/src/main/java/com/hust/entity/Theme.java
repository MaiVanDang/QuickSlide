// Theme.java
package com.hust.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "themes")
@Data
@NoArgsConstructor
public class Theme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String primaryColor;
    private String secondaryColor;
    private String fontFamily;
    private boolean isDefault = false; // Mẫu theme mặc định
}