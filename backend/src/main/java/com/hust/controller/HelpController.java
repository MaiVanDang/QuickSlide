package com.hust.controller;

import com.hust.dto.response.HelpTopicResponse;
import com.hust.service.HelpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/help")
public class HelpController {

    @Autowired
    private HelpService helpService;

    // --- 1. GET /api/help/categories?name=guide (No. 10 - ④, ⑤) ---
    @GetMapping("/categories")
    public ResponseEntity<List<HelpTopicResponse>> getTopicsByCategory(@RequestParam String name) {
        // Luồng này có thể để Public (permitAll) trong SecurityConfig
        List<HelpTopicResponse> topics = helpService.getTopicsByCategory(name);
        return ResponseEntity.ok(topics);
    }
    
    // --- 2. GET /api/help/search?query=... (No. 10 - ③) ---
    @GetMapping("/search")
    public ResponseEntity<List<HelpTopicResponse>> searchTopics(@RequestParam String query) {
        List<HelpTopicResponse> topics = helpService.searchTopics(query);
        return ResponseEntity.ok(topics);
    }
    
    // --- 3. GET /api/help/{id} (Xem chi tiết bài viết) ---
    @GetMapping("/{id}")
    public ResponseEntity<HelpTopicResponse> getTopicDetails(@PathVariable Long id) {
        // Giả định logic lấy chi tiết bài viết (bao gồm contentHtml)
        // Hiện tại không cần thiết, nhưng nên có endpoint để hoàn chỉnh luồng.
        return ResponseEntity.ok(HelpTopicResponse.builder()
                .id(id).title("Chi tiết bài viết").contentHtml("<h1>Hướng dẫn chi tiết</h1>").build());
    }
}