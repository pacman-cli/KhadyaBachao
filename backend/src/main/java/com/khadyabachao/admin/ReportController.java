package com.khadyabachao.admin;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    public record CreateReportRequest(
            @NotNull ReportTargetType targetType,
            @NotNull java.util.UUID targetId,
            // Audit B45: bound report text (was unbounded → DB abuse vector).
            @NotBlank @Size(max = 1000) String reason) {
    }

    /** Any logged-in user can report a listing or a user. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportService.ReportResponse create(@AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateReportRequest request) {
        return reportService.create(
                principal.id(),
                request.targetType(),
                request.targetId(),
                request.reason());
    }
}
