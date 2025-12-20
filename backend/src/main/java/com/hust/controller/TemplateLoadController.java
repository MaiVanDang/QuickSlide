package com.hust.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hust.entity.Presentation;
import com.hust.entity.Placeholder;
import com.hust.repository.PresentationRepository;
import com.hust.repository.TemplateRepository;

@RestController
@RequestMapping("/load")
public class TemplateLoadController {

    @Autowired
    private TemplateRepository templateRepository;

    @Autowired
    private PresentationRepository presentationRepository;

    @GetMapping("/template/{templateName}")
    public ResponseEntity<?> loadTemplate(@PathVariable String templateName) {
        return templateRepository.findByName(templateName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Template not found"));
    }

    @GetMapping("/placeholder/{title}")
    public ResponseEntity<Map<String, Object>> loadByTitle(@PathVariable String title) {
        return presentationRepository.findByTitle(title)
                .map(this::buildPlaceholderData)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> buildPlaceholderData(Presentation presentation) {
        return presentation.getSlides().stream()
                .flatMap(slide -> slide.getPlaceholders().stream())
                .collect(Collectors.toMap(
                        placeholder -> String.valueOf(placeholder.getId()),
                        this::createPlaceholderMap));
    }

    private Map<String, Object> createPlaceholderMap(Placeholder placeholder) {
        Map<String, Object> placeholderData = new HashMap<>();
        placeholderData.put("x", placeholder.getX());
        placeholderData.put("y", placeholder.getY());
        placeholderData.put("height", placeholder.getHeight());
        placeholderData.put("width", placeholder.getWidth());
        placeholderData.put("zIndex", placeholder.getZIndex());
        return placeholderData;
    }
}