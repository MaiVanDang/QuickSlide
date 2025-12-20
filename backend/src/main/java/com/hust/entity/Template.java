package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String name;

    private String description;

    // Theme identifier used by frontend to render preview (e.g. "blue", "green", "purple")
    private String theme;

    private Boolean isPublic = true; // Mặc định là Public (luật nghiệp vụ)

    @Column(name = "is_deleted")
    private Boolean isDeleted = false; // Xóa mềm (chỉ ẩn khỏi thư viện Tự tạo)

    @Column(columnDefinition = "TEXT")
    private String previewImageUrl;

    private Instant createdAt;

    // Used for Dashboard "recent" and edit history
    private Instant editedAt;

    // Template có thể có nhiều TemplateSlide (Bố cục khác nhau)
     @OneToMany(mappedBy = "template", cascade = CascadeType.ALL)
     private List<TemplateSlide> templateSlides;
}