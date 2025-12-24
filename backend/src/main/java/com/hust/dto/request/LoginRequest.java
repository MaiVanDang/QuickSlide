package com.hust.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    
    // Key này phải khớp với Frontend gửi lên (trong auth.ts)
    @NotBlank(message = "メールアドレスまたはユーザー名を入力してください。")
    private String usernameOrEmail; 

    @NotBlank(message = "パスワードは必須です。")
    private String password;
}