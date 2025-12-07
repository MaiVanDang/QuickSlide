package com.hust.repository;
import com.hust.entity.Placeholder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlaceholderRepository extends JpaRepository<Placeholder, Integer> {
    List<Placeholder> findBySlideId(Integer slideId);
}