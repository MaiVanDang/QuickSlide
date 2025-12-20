package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "slides")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Slide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "presentation_id", nullable = false)
    private Presentation presentation;

    @Column(name = "slide_index", nullable = false)
    private Integer slideIndex; // Thứ tự của slide

    @Column(name = "content_json", columnDefinition = "TEXT")
    private String contentJson; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "layout_used_id")
    private TemplateSlide layoutUsed;

    private Instant lastModified;

    private Integer userId;
    private Integer pageIndex;

    @OneToMany(mappedBy = "slide", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Placeholder> placeholders;
}