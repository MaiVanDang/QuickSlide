package com.hust.repository;

import com.hust.entity.Slide;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SlideRepository extends JpaRepository<Slide, Integer> {

    // Lấy tất cả slide thuộc về một Presentation, sắp xếp theo index
    List<Slide> findByPresentationIdOrderBySlideIndexAsc(Integer presentationId);
    
    // NEW: Đếm số lượng slide trong một Presentation (dùng để xác định index mới)
    Integer countByPresentationIdOrderBySlideIndexAsc(Integer presentationId);
}