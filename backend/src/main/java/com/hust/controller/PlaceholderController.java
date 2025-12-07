package com.hust.controller;

import com.hust.entity.*;
import com.hust.repository.*;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/placeholders")
public class PlaceholderController {
    @Autowired private PlaceholderRepository placeholderRepo;
    @Autowired private SlideRepository slideRepo;

    @GetMapping("/slide/{slideId}")
    public ResponseEntity<List<Placeholder>> getBySlide(@PathVariable Integer slideId) {
        return ResponseEntity.ok(placeholderRepo.findBySlideId(slideId));
    }

    @PostMapping("/save")
    public ResponseEntity<?> save(@RequestBody PlaceholderRequest req) {
        Slide slide = slideRepo.findById(req.getSlideId()).orElseThrow();
        Placeholder p = new Placeholder();
        // Logic đơn giản: Luôn tạo mới (để demo), thực tế nên check ID để update
        p.setSlide(slide);
        p.setType(req.getType());
        p.setX(req.getX());
        p.setY(req.getY());
        p.setWidth(req.getWidth());
        p.setHeight(req.getHeight());
        p.setZIndex(req.getZIndex());
        p.setProperties(req.getProperties());
        return ResponseEntity.ok(placeholderRepo.save(p));
    }
}

@Data
class PlaceholderRequest {
    private Integer slideId;
    private String type;
    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private Integer zIndex;
    private String properties;
}