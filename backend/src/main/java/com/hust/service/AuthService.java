package com.hust.service;

// [SỬA 1] Import 2 file DTO mới, bỏ AuthRequest cũ
import com.hust.dto.request.LoginRequest;
import com.hust.dto.request.RegisterRequest;
import com.hust.dto.response.AuthResponse;
import com.hust.entity.User;
import com.hust.exception.DuplicateException;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.UserRepository;
import com.hust.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
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
    private AuthenticationManager authenticationManager; 

    @Autowired
    private JwtUtil jwtUtil;

    // --- REGISTER (Sửa tham số đầu vào thành RegisterRequest) ---
    @Transactional
    public AuthResponse register(RegisterRequest request) { // [SỬA 2] Đổi AuthRequest -> RegisterRequest

        // Kiểm tra confirm password
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("パスワードと確認用パスワードが一致しません。");
        }

        // Kiểm tra trùng username (Dùng request.getUsername() từ RegisterRequest)
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new DuplicateException("ユーザー名は既に使用されています。");
        }

        // Kiểm tra trùng email
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateException("メールアドレスは既に登録されています。");
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
            "登録に成功しました"
        );
    }

    // --- LOGIN (Sửa tham số đầu vào thành LoginRequest) ---
    public AuthResponse login(LoginRequest request) { // [SỬA 3] Đổi AuthRequest -> LoginRequest

        // LoginRequest chỉ chứa usernameOrEmail và password -> Không bị lỗi validate các trường thừa
        User user = userRepository
                .findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new ResourceNotFoundException("ユーザー名またはパスワードが正しくありません"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("ユーザー名またはパスワードが正しくありません");
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
            "ログインに成功しました"
        );
    }
}