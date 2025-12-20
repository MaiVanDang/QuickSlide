package com.hust.repository;

import com.hust.entity.TemplateSlide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TemplateSlideRepository extends JpaRepository<TemplateSlide, Integer> {
    List<TemplateSlide> findByTemplateIdOrderBySlideOrderAsc(Integer templateId);

    void deleteByTemplateId(Integer templateId);
}