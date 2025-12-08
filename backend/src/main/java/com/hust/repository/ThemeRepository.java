package com.hust.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.hust.entity.Theme;

public interface ThemeRepository extends JpaRepository<Theme, Integer> {

}