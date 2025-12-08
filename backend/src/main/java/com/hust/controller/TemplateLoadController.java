package com.hust.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hust.repository.TemplateRepository;

@RestController
@RequestMapping("/load")
public class TemplateLoadController {
    @Autowired
    private TemplateRepository templateRepository;

    @GetMapping("/template/{templateName}")
    public ResponseEntity<String> loadTemplate(@PathVariable String templateName) {
        return templateRepository.findByName(templateName)
                .map(template -> ResponseEntity.ok(template.getTheme().getThumbnail()))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Template not found"));
    }
}
