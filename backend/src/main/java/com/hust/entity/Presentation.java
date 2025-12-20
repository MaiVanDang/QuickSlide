package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "presentations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Presentation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "based_on_template_id")
    private Template basedOnTemplate; // Template được sử dụng để tạo dự án này

    private Instant createdAt;

    private Instant editedDate; // Dùng để sắp xếp trong Dashboard (No. 3)

    // @OneToMany(mappedBy = "presentation", cascade = CascadeType.ALL)
    // private List<Slide> slides; 
}