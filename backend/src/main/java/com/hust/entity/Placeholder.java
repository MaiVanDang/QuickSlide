package com.hust.entity;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "placeholders")
@Data
public class Placeholder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "slide_id")
    private Slide slide;

    private String type; // TEXT, IMAGE...
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private Integer zIndex;
    
    @Column(columnDefinition = "TEXT")
    private String properties; // JSON string
}