package com.hust.config;

import com.hust.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource)) 

            // 3. Quy tắc ủy quyền (Authorization Rules)
            .authorizeHttpRequests(auth -> auth
                // **[FIX LỖI 403] Cho phép /auth/** (loại bỏ /api/ thừa) **
                .requestMatchers("/auth/**").permitAll() 
                
                // Cho phép /help/** (loại bỏ /api/ thừa)
                .requestMatchers("/help/**").permitAll() 

                // Allow reading public templates without login
                .requestMatchers(HttpMethod.GET, "/templates", "/templates/**").permitAll()

                // Allow CORS preflight
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // Tất cả các request khác phải được xác thực
                .anyRequest().authenticated()
            )
            
            // 4. Cấu hình quản lý Session (sử dụng STATELESS cho JWT)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // 5. Thêm JWT Filter
            .addFilterBefore(
                jwtAuthenticationFilter, 
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}