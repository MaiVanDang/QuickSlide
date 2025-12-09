package com.hust.repository;

import com.hust.entity.Template;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TemplateRepository extends JpaRepository<Template, Integer> {
    
    
    // 1. Dùng cho getTemplateById và createTemplateFromCopy
    @Query("SELECT t FROM Template t WHERE t.id = :id AND (t.isPublic = true OR t.user.id = :userId)")
    Optional<Template> findByIdAndIsPublicTrueOrIdAndUserId(Integer id, Integer userId);

    // 2. Dùng cho getAllTemplates và getRecentTemplates
    @Query("SELECT t FROM Template t WHERE t.isPublic = true OR t.user.id = :userId")
    List<Template> findByIsPublicTrueOrUserId(Integer userId);
    
    // 3. Dùng cho getRecentTemplates (có phân trang)
    @Query("SELECT t FROM Template t WHERE t.isPublic = true OR t.user.id = :userId")
    Page<Template> findByIsPublicTrueOrUserId(Integer userId, Pageable pageable);
    Optional<Template> findByIdAndUser_Id(Integer id, Integer userId); 
    
}