package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    
    // Key này phải khớp với Frontend gửi lên (trong auth.ts)
    @NotBlank(message = "Vui lòng nhập email hoặc tên đăng nhập")
    private String usernameOrEmail; 

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}