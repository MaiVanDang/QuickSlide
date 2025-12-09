package com.hust.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hust.entity.Presentation;
import com.hust.repository.PresentationRepository;
import com.hust.repository.TemplateRepository;

import jakarta.validation.constraints.Null;

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
    public ResponseEntity<Presentation> loadByTitle(@PathVariable String title) {
        Optional<Presentation> presentation = presentationRepository.findByTitle(title);
        if (presentation.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(presentation.get());

    }

}
