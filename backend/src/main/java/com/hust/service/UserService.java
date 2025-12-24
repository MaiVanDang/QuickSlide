package com.hust.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hust.dto.request.UserSettingsRequest;
import com.hust.dto.response.UserSettingsResponse;
import com.hust.entity.User;
import com.hust.exception.ResourceNotFoundException;
import com.hust.repository.UserRepository;
import com.hust.util.SecurityUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@Slf4j
public class UserService {

    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper; // Dùng để chuyển đổi giữa JSON và Java Object

    // --- 1. Lấy Cài đặt hiện tại (Settings.tsx load) ---
    public UserSettingsResponse getCurrentSettings(Long currentUserId) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが存在しません。"));

        if (user.getSettingsJson() == null || user.getSettingsJson().isEmpty()) {
            // Trả về cài đặt mặc định nếu chưa có
            return getDefaultSettings();
        }

        try {
            // Deserialize JSON settings từ DB sang Request Object
            UserSettingsRequest request = objectMapper.readValue(user.getSettingsJson(), UserSettingsRequest.class);
            
            // Map Request Object sang Response DTO
            return UserSettingsResponse.builder()
                    .language(request.getLanguage())
                    .theme(request.getTheme())
                    .font(request.getFont())
                    .defaultSlideBackgroundColor(request.getDefaultSlideBackgroundColor())
                    .autoSaveEnabled(request.getAutoSaveEnabled())
                    .build();
        } catch (JsonProcessingException e) {
            log.error("User {} の設定JSON読み取りエラー: {}", currentUserId, e.getMessage());
            return getDefaultSettings();
        }
    }

    // --- 2. Cập nhật Cài đặt (Settings.tsx save) ---
    @Transactional
    public UserSettingsResponse updateSettings(UserSettingsRequest request, Long currentUserId) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが存在しません。"));
        
        try {
            // Serialize Request Object thành JSON String
            String settingsJson = objectMapper.writeValueAsString(request);
            
            user.setSettingsJson(settingsJson);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);

            // historyLogService.logAction("UPDATE_SETTINGS", "USER", currentUserId, currentUserId);
            
            // Map Request Object sang Response DTO để xác nhận
            return UserSettingsResponse.builder()
                    .language(request.getLanguage())
                    .theme(request.getTheme())
                    .font(request.getFont())
                    .defaultSlideBackgroundColor(request.getDefaultSlideBackgroundColor())
                    .autoSaveEnabled(request.getAutoSaveEnabled())
                    .build();

        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("設定JSONデータの形式が正しくありません。");
        }
    }
    
    // --- Helper: Cài đặt Mặc định ---
    private UserSettingsResponse getDefaultSettings() {
        return UserSettingsResponse.builder()
                .language("ja") // Mặc định là Tiếng Nhật
                .theme("light")
                .font("Noto Sans JP")
                .defaultSlideBackgroundColor("#ffffff")
                .autoSaveEnabled(true)
                .build();
    }
}