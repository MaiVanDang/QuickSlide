package com.hust.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import com.hust.entity.Template;

public interface TemplateRepository extends JpaRepository<Template, Integer> {
    Optional<Template> findByName(String name);
}