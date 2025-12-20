package com.hust.repository;

import com.hust.entity.Presentation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PresentationRepository extends JpaRepository<Presentation, Integer> {

    // Lấy các dự án gần đây của một User, sắp xếp theo ngày chỉnh sửa giảm dần (No. 3)
    List<Presentation> findByOwnerIdOrderByEditedDateDesc(Integer ownerId);

    Optional<Presentation> findByTitle(String title);
}