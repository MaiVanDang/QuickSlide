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
            throw new IllegalArgumentException("パスワードとパスワードの確認が一致しません");
        }

        // Kiểm tra trùng username (Dùng request.getUsername() từ RegisterRequest)
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new DuplicateException("ユーザー名はすでに使用されています");
        }

        // Kiểm tra trùng email
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateException("メールアドレスが登録されました");
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
                "登録が完了しました");
    }

    // --- LOGIN (Sửa tham số đầu vào thành LoginRequest) ---
    public AuthResponse login(LoginRequest request) { // [SỬA 3] Đổi AuthRequest -> LoginRequest

        // LoginRequest chỉ chứa usernameOrEmail và password -> Không bị lỗi validate
        // các trường thừa
        User user = userRepository
                .findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new ResourceNotFoundException("ユーザー名またはパスワードが間違っています"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("ユーザー名またはパスワードが間違っています");
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                "ログイン成功");
    }
}