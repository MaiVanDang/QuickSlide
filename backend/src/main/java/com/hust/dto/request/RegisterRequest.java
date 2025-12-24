package com.hust.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    
    @NotBlank(message = "ユーザー名は必須です。")
    @Size(min = 6, max = 50, message = "ユーザー名は6〜50文字で入力してください。")
    private String username; 
    
    @NotBlank(message = "メールアドレスは必須です。")
    @Email(message = "メールアドレスの形式が正しくありません。")
    private String email; 
    
    @NotBlank(message = "パスワードは必須です。")
    @Size(min = 6, message = "パスワードは6文字以上で入力してください。")
    private String password;
    
    @NotBlank(message = "確認用パスワードは必須です。") 
    private String confirmPassword; 
}