package com.hust.repository;

import com.hust.entity.Template;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TemplateRepository extends JpaRepository<Template, Integer> {

    // Lấy template công khai hoặc của user hiện tại, có phân trang
    @Query("SELECT t FROM Template t WHERE t.isPublic = true OR t.user.id = :userId")
    Page<Template> findByIsPublicTrueOrUserId(Integer userId, Pageable pageable);

    // Lấy một template cụ thể theo ID, chỉ khi nó công khai hoặc thuộc sở hữu của user
    @Query("SELECT t FROM Template t WHERE t.id = :id AND (t.isPublic = true OR t.user.id = :userId)")
    Optional<Template> findByIdAndIsPublicTrueOrIdAndUserId(Integer id, Integer userId);

    // Lấy tất cả templates công khai hoặc của user hiện tại (dành cho getAllTemplates)
    @Query("SELECT t FROM Template t WHERE t.isPublic = true OR t.user.id = :userId")
    java.util.List<Template> findByIsPublicTrueOrUserId(Integer userId);
}
