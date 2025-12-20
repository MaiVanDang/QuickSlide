package com.hust.repository;

import com.hust.entity.Template;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TemplateRepository extends JpaRepository<Template, Integer> {

        @Query("""
            select t from Template t
            join t.owner o
            where t.isPublic = true
            order by coalesce(t.editedAt, t.createdAt) desc
            """)
        List<Template> findPublicTemplatesOrderByRecency();
    
        @Query("""
            select t from Template t
            join t.owner o
            where o.id = :ownerId
              and t.isDeleted = false
            order by coalesce(t.editedAt, t.createdAt) desc
            """)
        List<Template> findMineTemplatesOrderByRecency(@Param("ownerId") Integer ownerId);
    
    List<Template> findAll();


    Optional<Object> findByName(String templateName);
}