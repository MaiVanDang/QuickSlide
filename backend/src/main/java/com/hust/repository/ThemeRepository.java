package com.hust.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hust.entity.Theme;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, Integer> {

}