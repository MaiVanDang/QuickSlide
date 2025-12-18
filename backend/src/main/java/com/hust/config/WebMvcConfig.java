package com.hust.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class WebMvcConfig {

    // Lấy giá trị từ application.yml
    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${cors.allowed-methods}")
    private String allowedMethods;

    @Value("${cors.allowed-headers}")
    private String allowedHeaders;

    @Value("${cors.allow-credentials}")
    private boolean allowCredentials;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Cấu hình danh sách Origins được phép truy cập (Ví dụ: http://localhost:3000)
        configuration.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        
        // Cấu hình các phương thức HTTP được phép (GET, POST, PUT, DELETE, OPTIONS)
        configuration.setAllowedMethods(List.of(allowedMethods.split(",")));
        
        // Cấu hình các Header được phép - cho phép tất cả headers
        if ("*".equals(allowedHeaders.trim())) {
            configuration.addAllowedHeader("*");
        } else {
            configuration.setAllowedHeaders(List.of(allowedHeaders.split(",")));
        }
        
        // Cho phép gửi Cookies và thông tin xác thực (quan trọng cho JWT/Sessions nếu có)
        configuration.setAllowCredentials(allowCredentials);
        
        // Expose headers để frontend có thể đọc
        configuration.addExposedHeader("Authorization");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Áp dụng cấu hình CORS cho tất cả các endpoint (/api/**)
        source.registerCorsConfiguration("/**", configuration); 
        
        return source;
    }
}