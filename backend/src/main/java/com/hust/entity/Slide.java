package com.hust.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Table(name = "slides")
@Data
public class Slide {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer userId; // Demo: Lưu ID user đơn giản
    private Integer pageIndex;

    @OneToMany(mappedBy = "slide", cascade = CascadeType.ALL)
    private List<Placeholder> placeholders;
}