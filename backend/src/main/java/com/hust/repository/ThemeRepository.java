// backend/src/main/java/com/hust/repository/ThemeRepository.java

package com.hust.repository;

import com.hust.entity.Theme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Long> {
    
}