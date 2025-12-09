package com.hust.entity;

import java.util.List;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "presentations")
@Data
public class Presentation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "title")
    private String title;
    @OneToMany(mappedBy = "presentation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Slide> slides;
}
