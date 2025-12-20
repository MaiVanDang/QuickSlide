package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "slides")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Slide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "presentation_id", nullable = false)
    private Presentation presentation;

    @Column(name = "slide_index", nullable = false)
    private Integer slideIndex; // Thứ tự của slide

    // JSON String chứa nội dung chi tiết (text, image URLs, data từ Quick Create)
    @Column(name = "content_json", columnDefinition = "TEXT")
    private String contentJson; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "layout_used_id")
    private TemplateSlide layoutUsed; // TemplateSlide được dùng làm bố cục

    private Instant lastModified;
}