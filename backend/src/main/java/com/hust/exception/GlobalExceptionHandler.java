package com.hust.exception;

import com.hust.dto.response.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MissingPathVariableException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import jakarta.validation.ConstraintViolationException;

import java.time.Instant;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    // ========================================================================
    // 0. Unauthorized (401)
    // ========================================================================
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex, WebRequest request) {
        return buildError(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    // ========================================================================
    // 1. Resource Not Found (404)
    // ========================================================================
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, WebRequest request) {
        return buildError(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    // ========================================================================
    // 2. Duplicate / Conflict (409)
    // ========================================================================
    @ExceptionHandler(DuplicateException.class)
    public ResponseEntity<ErrorResponse> handleDuplicate(DuplicateException ex, WebRequest request) {
        return buildError(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    // ========================================================================
    // 3. Validation: @Valid trên DTO (400)
    // ========================================================================
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {

        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));

        return buildError(HttpStatus.BAD_REQUEST, errors, request);
    }

    // ========================================================================
    // 4. Validation: @Validated trên @RequestParam, @PathVariable (400)
    // ========================================================================
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, WebRequest request) {

        String errors = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));

        return buildError(HttpStatus.BAD_REQUEST, errors, request);
    }

    // ========================================================================
    // 5. Missing parameters (400)
    // ========================================================================
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParams(MissingServletRequestParameterException ex, WebRequest request) {
        return buildError(HttpStatus.BAD_REQUEST, "必須パラメータが不足しています: " + ex.getParameterName(), request);
    }

    // ========================================================================
    // 6. Missing path variable (400)
    // ========================================================================
    @ExceptionHandler(MissingPathVariableException.class)
    public ResponseEntity<ErrorResponse> handleMissingPath(MissingPathVariableException ex, WebRequest request) {
        return buildError(HttpStatus.BAD_REQUEST, "必須のパス変数が不足しています: " + ex.getVariableName(), request);
    }

    // ========================================================================
    // 7. Unsupported HTTP Method: 405
    // ========================================================================
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, WebRequest request) {
        return buildError(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage(), request);
    }

    // ========================================================================
    // 8. Unsupported Media Type: 415
    // ========================================================================
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedMedia(HttpMediaTypeNotSupportedException ex, WebRequest request) {
        return buildError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ex.getMessage(), request);
    }

    // ========================================================================
    // 9. No handler mapping (khi URL không tồn tại): 404
    // ========================================================================
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoHandler(NoHandlerFoundException ex, WebRequest request) {
        return buildError(HttpStatus.NOT_FOUND, "パスが見つかりません: " + ex.getRequestURL(), request);
    }

    // ========================================================================
    // 9b. No static resource / route not found (Spring 6): 404
    // ========================================================================
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex, WebRequest request) {
        return buildError(HttpStatus.NOT_FOUND, "パスが見つかりません", request);
    }

    // ========================================================================
    // 10. IllegalArgumentException, SecurityException → 400
    // ========================================================================
    @ExceptionHandler({IllegalArgumentException.class, SecurityException.class})
    public ResponseEntity<ErrorResponse> handleIllegal(RuntimeException ex, WebRequest request) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    // ========================================================================
    // 11. Tất cả lỗi còn lại → 500
    // ========================================================================
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobal(Exception ex, WebRequest request) {

        // TODO: thêm log tại đây nếu cần
        ex.printStackTrace();

        return buildError(
                HttpStatus.INTERNAL_SERVER_ERROR,
            "システムエラー: " + ex.getMessage(),
                request
        );
    }

    // ========================================================================
    // Hàm dùng chung để build response
    // ========================================================================
    private ResponseEntity<ErrorResponse> buildError(HttpStatus status, String message, WebRequest request) {
        ErrorResponse error = new ErrorResponse(
                status.value(),
                Instant.now(),
                message,
                request.getDescription(false)
        );
        return new ResponseEntity<>(error, status);
    }
}
