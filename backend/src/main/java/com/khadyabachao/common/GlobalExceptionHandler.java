package com.khadyabachao.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleBadRequest(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ProblemDetail handleStatus(org.springframework.web.server.ResponseStatusException e) {
        return ProblemDetail.forStatusAndDetail(e.getStatusCode(), e.getReason() != null ? e.getReason() : e.getMessage());
    }

    @ExceptionHandler({org.springframework.security.access.AccessDeniedException.class,
        org.springframework.security.authorization.AuthorizationDeniedException.class})
    public ProblemDetail handleAccessDenied(Exception e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException e) {
        String detail = e.getBindingResult().getFieldErrors().stream()
            .map(err -> err.getField() + ": " + err.getDefaultMessage())
            .findFirst()
            .orElse("Validation failed");
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }

    // Live E2E finding: a syntactically invalid body (bad JSON, wrong types)
    // fell through to the catch-all handler and surfaced as a logged 500 with
    // a stack trace. It is a client error and must map to 400.
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadable(org.springframework.http.converter.HttpMessageNotReadableException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Malformed request body");
    }

    // Live full-mode finding: an invalid/expired Firebase ID token propagated
    // to the catch-all handler and surfaced as a logged 500. It is an auth
    // failure and must map to 401 so clients can prompt re-login.
    @ExceptionHandler(com.khadyabachao.auth.InvalidTokenException.class)
    public ProblemDetail handleInvalidToken(com.khadyabachao.auth.InvalidTokenException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED,
            e.getMessage() != null ? e.getMessage() : "Invalid Firebase ID token");
    }

    // Spring MVC 3 reports unmapped paths as NoResourceFoundException; without
    // this it falls through to the catch-all and unknown URLs return 500.
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ProblemDetail handleNoResource(org.springframework.web.servlet.resource.NoResourceFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Not found");
    }

    // Concurrent writers on the same listing (optimistic @Version check) — a
    // retryable conflict, not a server fault.
    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ProblemDetail handleOptimisticLock(org.springframework.dao.OptimisticLockingFailureException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
            "This record was just modified by someone else — please retry");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception e) {
        log.error("Unhandled exception", e);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
    }
}
