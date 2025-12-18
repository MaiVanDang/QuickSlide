package com.hust.repository;

import com.hust.entity.Presentation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PresentationRepository extends JpaRepository<Presentation, Long> {

    // Lấy các dự án gần đây của một User, sắp xếp theo ngày chỉnh sửa giảm dần (No. 3)
    List<Presentation> findByOwnerIdOrderByEditedDateDesc(Long ownerId);
}