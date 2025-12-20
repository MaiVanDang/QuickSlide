package com.hust.repository;

import com.hust.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    
    // Dùng cho CustomUserDetailsService và kiểm tra Username trùng
    Optional<User> findByUsername(String username);
    
    // BỔ SUNG: Dùng cho kiểm tra Email trùng (trong AuthService.register)
    Optional<User> findByEmail(String email);
    
    // Dùng cho đăng nhập (có thể dùng username hoặc email)
    // Spring Data JPA sẽ dịch thành WHERE username = ?1 OR email = ?2
    Optional<User> findByUsernameOrEmail(String username, String email);
}