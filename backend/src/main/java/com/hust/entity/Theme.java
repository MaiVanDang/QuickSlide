package com.hust.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "theme")
@Data
public class Theme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "theme_name")
    private String name;
    @Column(name = "thumbnail_url")
    private String thumbnail;
}
