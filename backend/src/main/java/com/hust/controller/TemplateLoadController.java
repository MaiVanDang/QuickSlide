package com.hust.controller;

import java.util.HashMap;
import java.util.Optional;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hust.entity.Presentation;
import com.hust.entity.Slide;
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
    public ResponseEntity<String> loadTemplate(@PathVariable String templateName) {
        return templateRepository.findByName(templateName)
                .map(template -> ResponseEntity.ok(template.getTheme().getThumbnail()))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Template not found"));
    }

    @GetMapping("/placeholder/{title}")
    public ResponseEntity<?> loadByTitle(@PathVariable String title) {
        Optional<Presentation> presentation = presentationRepository.findByTitle(title);
        if (presentation.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> data = new HashMap<>();
        List<Slide> slides = presentation.get().getSlides();
        for (Slide slide : slides) {
            List<Placeholder> placeholders = slide.getPlaceholders();
            for (Placeholder placeholder : placeholders) {
                Map<String, Object> pData = new HashMap<>();
                pData.put("x", placeholder.getX());
                pData.put("y", placeholder.getY());
                pData.put("height", placeholder.getHeight());
                pData.put("width", placeholder.getWidth());
                pData.put("zIndex", placeholder.getZIndex());
                data.put(String.valueOf(placeholder.getId()), pData);
            }

        }
        return ResponseEntity.ok(data);
    }

}
