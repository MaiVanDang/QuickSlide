package com.hust.repository;

import com.hust.entity.Slide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SlideRepository extends JpaRepository<Slide, Integer> {
    List<Slide> findByPresentationId(Integer presentationId);
}