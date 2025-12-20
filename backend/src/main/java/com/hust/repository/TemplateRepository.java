package com.hust.repository;

import com.hust.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TemplateRepository extends JpaRepository<Template, Long> {

    // Lấy tất cả Template được đánh dấu là public (khu vực Công khai)
        // Use JOIN to guarantee owner exists and avoid legacy bad rows causing 500.
        @Query("""
            select t from Template t
            join t.owner o
            where t.isPublic = true
            order by coalesce(t.editedAt, t.createdAt) desc
            """)
        List<Template> findPublicTemplatesOrderByRecency();
    
    // Lấy các Template của một User (khu vực Tự tạo) và chưa bị xóa mềm
        @Query("""
            select t from Template t
            join t.owner o
            where o.id = :ownerId
              and t.isDeleted = false
            order by coalesce(t.editedAt, t.createdAt) desc
            """)
        List<Template> findMineTemplatesOrderByRecency(@Param("ownerId") Long ownerId);
    
    // Lấy tất cả Template (dùng cho mục đích quản trị hoặc toàn hệ thống)
    List<Template> findAll();
}