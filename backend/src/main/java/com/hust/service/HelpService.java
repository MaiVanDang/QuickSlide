package com.hust.service;

import com.hust.dto.response.HelpTopicResponse;
import com.hust.util.SecurityUtil;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HelpService {

    // Mockup data (Trong thực tế, dữ liệu này sẽ đến từ database/CMS)
    private final List<HelpTopicResponse> mockData = Arrays.asList(
        HelpTopicResponse.builder().id(1L).title("QuickSlideへようこそ").preview("基本ガイド").category("getting-started").build(),
        HelpTopicResponse.builder().id(2L).title("最初のスライドを作成する").preview("最初のスライド作成").category("getting-started").build(),
        HelpTopicResponse.builder().id(3L).title("テンプレートの使い方").preview("テンプレートの利用").category("getting-started").build(),
        
        HelpTopicResponse.builder().id(4L).title("アカウントの作成").preview("新規アカウント登録").category("account").build(),
        HelpTopicResponse.builder().id(5L).title("パスワードのリセット").preview("パスワードの復元").category("account").build(),
        
        HelpTopicResponse.builder().id(6L).title("クイック作成の使い方").preview("クイック作成の利用").category("guide").build(),
        HelpTopicResponse.builder().id(7L).title("バッチ生成の活用").preview("スライドの一括生成").category("guide").build()
    );

    // --- 1. Lấy danh sách Chủ đề theo Danh mục (No. 10 - ④, ⑤) ---
    public List<HelpTopicResponse> getTopicsByCategory(String category) {
        return mockData.stream()
                .filter(topic -> topic.getCategory().equalsIgnoreCase(category))
                .collect(Collectors.toList());
    }

    // --- 2. Tìm kiếm Chủ đề (No. 10 - ③) ---
    public List<HelpTopicResponse> searchTopics(String query) {
        if (query == null || query.isBlank()) {
            // Trả về mặc định nếu query rỗng
            return getTopicsByCategory("getting-started"); 
        }

        // Thực hiện tìm kiếm toàn văn (full-text search) trên Title và Preview
        String lowerCaseQuery = query.toLowerCase();
        return mockData.stream()
                .filter(topic -> topic.getTitle().toLowerCase().contains(lowerCaseQuery) ||
                                 topic.getPreview().toLowerCase().contains(lowerCaseQuery))
                .collect(Collectors.toList());
    }
}