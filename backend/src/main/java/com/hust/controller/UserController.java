package com.hust.controller;

import com.hust.dto.request.UserSettingsRequest;
import com.hust.dto.response.UserSettingsResponse;
import com.hust.service.UserService;
import com.hust.util.SecurityUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    // --- 1. GET /api/user/settings (No. 9: Tải Cài đặt) ---
    @GetMapping("/settings")
    public ResponseEntity<UserSettingsResponse> getSettings() {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        UserSettingsResponse settings = userService.getCurrentSettings(currentUserId);
        
        return ResponseEntity.ok(settings);
    }

    // --- 2. PUT /api/user/settings (No. 9: Lưu Cài đặt ⑤) ---
    @PutMapping("/settings")
    public ResponseEntity<UserSettingsResponse> updateSettings(@Valid @RequestBody UserSettingsRequest request) {
        
        Integer currentUserId = SecurityUtil.getCurrentUserId();
        UserSettingsResponse updatedSettings = userService.updateSettings(request, currentUserId);
        
        return ResponseEntity.ok(updatedSettings);
    }
}