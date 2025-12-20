package com.hust.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "slides")
@Data
@JsonIgnoreProperties({ "presentation" })
public class Slide {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "presentation_id")
    private Presentation presentation;
    private Integer userId; // Demo: Lưu ID user đơn giản
    private Integer pageIndex;

    @OneToMany(mappedBy = "slide", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Placeholder> placeholders;
}