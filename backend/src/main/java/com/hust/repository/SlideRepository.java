package com.hust.repository;

import com.hust.entity.Slide;
import com.hust.entity.TemplateSlide;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SlideRepository extends JpaRepository<Slide, Long> {

    // Lấy tất cả slide thuộc về một Presentation, sắp xếp theo index
    List<Slide> findByPresentationIdOrderBySlideIndexAsc(Long presentationId);
    
    // NEW: Đếm số lượng slide trong một Presentation (dùng để xác định index mới)
    long countByPresentationIdOrderBySlideIndexAsc(Long presentationId);

    // Bulk detach/reassign layoutUsed to avoid FK violations when deleting TemplateSlide.
    @Modifying
    @Query("update Slide s set s.layoutUsed = :fallback where s.layoutUsed.id in :templateSlideIds")
    int reassignLayoutUsed(@Param("templateSlideIds") List<Long> templateSlideIds,
                           @Param("fallback") TemplateSlide fallback);

    @Modifying
    @Query("update Slide s set s.layoutUsed = null where s.layoutUsed.id in :templateSlideIds")
    int clearLayoutUsed(@Param("templateSlideIds") List<Long> templateSlideIds);
}