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


    @GetMapping("/categories")
    public ResponseEntity<List<HelpTopicResponse>> getTopicsByCategory(@RequestParam String name) {

        List<HelpTopicResponse> topics = helpService.getTopicsByCategory(name);
        return ResponseEntity.ok(topics);
    }
    

    @GetMapping("/search")
    public ResponseEntity<List<HelpTopicResponse>> searchTopics(@RequestParam String query) {
        List<HelpTopicResponse> topics = helpService.searchTopics(query);
        return ResponseEntity.ok(topics);
    }
    

    @GetMapping("/{id}")
    public ResponseEntity<HelpTopicResponse> getTopicDetails(@PathVariable Integer id) {

        return ResponseEntity.ok(HelpTopicResponse.builder()
                .id(id).title("Chi tiết bài viết").contentHtml("<h1>Hướng dẫn chi tiết</h1>").build());
    }
}