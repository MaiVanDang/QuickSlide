package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "templates") 
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Template {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "template_content", columnDefinition = "TEXT", nullable = false)
    private String templateContent; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false) 
    private User user; 

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false; 
    
    public Template(String name, String description, String templateContent, User user, Boolean isPublic) {
        this.name = name;
        this.description = description;
        this.templateContent = templateContent;
        this.user = user;
        this.isPublic = isPublic;
    }
}