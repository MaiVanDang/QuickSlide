package com.hust.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "history_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "action_type", nullable = false)
    private String actionType; // Ví dụ: CREATE_PROJECT, UPDATE_SLIDE, DELETE_TEMPLATE

    @Column(name = "entity_type")
    private String entityType; // Ví dụ: PRESENTATION, TEMPLATE

    @Column(name = "entity_id")
    private Long entityId; // ID của entity bị tác động

    private Instant timestamp;
}