package com.hust.service;

import com.hust.dto.request.LoginRequest;
import com.hust.dto.request.RegisterRequest;
import com.hust.dto.response.AuthResponse;
import com.hust.entity.User;
import com.hust.exception.DuplicateException;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.UserRepository;
import com.hust.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    // --- REGISTER (Sửa tham số đầu vào thành RegisterRequest) ---
    @Transactional
    public AuthResponse register(RegisterRequest request) { // [SỬA 2] Đổi AuthRequest -> RegisterRequest

        // Kiểm tra confirm password
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Mật khẩu và xác nhận mật khẩu không khớp.");
        }

        // Kiểm tra trùng username (Dùng request.getUsername() từ RegisterRequest)
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new DuplicateException("Tên người dùng đã được sử dụng.");
        }

        // Kiểm tra trùng email
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateException("Email đã được đăng ký.");
        }

        // Tạo user mới
        User user = new User();
        user.setUsername(request.getUsername()); // Lấy từ field username
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        User savedUser = userRepository.save(user);

        String token = jwtUtil.generateToken(savedUser.getUsername());

        return new AuthResponse(
                token,
                savedUser.getId(),
                savedUser.getUsername(),
                "Đăng ký thành công");
    }

    // --- LOGIN (Sửa tham số đầu vào thành LoginRequest) ---
    public AuthResponse login(LoginRequest request) { // [SỬA 3] Đổi AuthRequest -> LoginRequest

        // LoginRequest chỉ chứa usernameOrEmail và password -> Không bị lỗi validate
        // các trường thừa
        User user = userRepository
                .findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Tên đăng nhập hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Tên đăng nhập hoặc mật khẩu không đúng");
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                "Đăng nhập thành công");
    }
}