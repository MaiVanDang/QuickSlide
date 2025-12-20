package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "template_slides")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TemplateSlide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;

    @Column(name = "layout_json", columnDefinition = "TEXT")
    private String layoutJson; 

    @Column(name = "slide_order")
    private Integer slideOrder; 

    private Instant createdAt;
}