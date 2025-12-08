package com.hust.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "slide_templates")
@Data
public class Template {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @ManyToOne
    @JoinColumn(name = "theme_id")
    private Theme theme;
    @Column(name = "template_name")
    private String name;
    @Column(name = "default_content")
    private String content;
}
