package com.hust.repository;

import com.hust.entity.HistoryLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoryLogRepository extends JpaRepository<HistoryLog, Long> {
    // Các phương thức tìm kiếm log theo User, Entity, hoặc ActionType
}