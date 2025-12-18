package com.hust.util;

import com.hust.entity.User;
import com.hust.exception.UnauthorizedException;
import com.hust.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

// Lớp tiện ích để lấy thông tin người dùng đang đăng nhập
@Component
public class SecurityUtil {

    private static UserRepository userRepository;

    public SecurityUtil(UserRepository userRepository) {
        SecurityUtil.userRepository = userRepository;
    }

    public static String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            return ((UserDetails) authentication.getPrincipal()).getUsername();
        }
        return null;
    }

    public static Long getCurrentUserId() {
        String username = getCurrentUsername();
        if (username == null || username.isBlank()) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }

        if (userRepository == null) {
            throw new IllegalStateException("UserRepository chưa được khởi tạo trong SecurityUtil");
        }

        User user = userRepository.findByUsernameOrEmail(username, username)
            .orElseThrow(() -> new SecurityException("Không tìm thấy người dùng hiện tại"));
        return user.getId();
    }
}