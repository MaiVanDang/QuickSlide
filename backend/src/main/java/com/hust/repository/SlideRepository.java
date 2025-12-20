package com.hust.repository;

import com.hust.entity.Slide;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SlideRepository extends JpaRepository<Slide, Long> {

    // Lấy tất cả slide thuộc về một Presentation, sắp xếp theo index
    List<Slide> findByPresentationIdOrderBySlideIndexAsc(Long presentationId);
    
    // NEW: Đếm số lượng slide trong một Presentation (dùng để xác định index mới)
    long countByPresentationIdOrderBySlideIndexAsc(Long presentationId);
}