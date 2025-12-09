package com.hust.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import com.hust.entity.Presentation;

@Repository
public interface PresentationRepository extends JpaRepository<Presentation, Integer> {
    Optional<Presentation> findByTitle(String title);
}
