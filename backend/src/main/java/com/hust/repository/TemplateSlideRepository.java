package com.hust.repository;

import com.hust.entity.TemplateSlide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TemplateSlideRepository extends JpaRepository<TemplateSlide, Long> {
    // Thêm các phương thức tìm kiếm cụ thể nếu cần (ví dụ: tìm tất cả slide mẫu thuộc về một Template)
    List<TemplateSlide> findByTemplateIdOrderBySlideOrderAsc(Long templateId);

    void deleteByTemplateId(Long templateId);
}