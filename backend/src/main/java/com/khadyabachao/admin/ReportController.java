package com.khadyabachao.admin;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    public record CreateReportRequest(
        @NotBlank ReportTargetType targetType,
        java.util.UUID targetId,
        @NotBlank String reason) {
    }

    public record ReportResponse(
        java.util.UUID id,
        java.util.UUID reporterId,
        String reporterName,
        ReportTargetType targetType,
        java.util.UUID targetId,
        String reason,
        ReportStatus status,
        Instant createdAt) {

        public static ReportResponse from(Report r) {
            return new ReportResponse(
                r.getId(),
                r.getReporter().getId(),
                r.getReporter().getName(),
                r.getTargetType(),
                r.getTargetId(),
                r.getReason(),
                r.getStatus(),
                r.getCreatedAt());
        }
    }

    /** Any logged-in user can report a listing or a user. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse create(@AuthenticationPrincipal AuthenticatedUser principal,
                                 @RequestBody CreateReportRequest request) {
        // validate target exists to avoid junk rows
        if (request.targetType() == ReportTargetType.USER) {
            userRepository.findById(request.targetId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reported user not found"));
        }

        User reporter = userRepository.findById(principal.id()).orElseThrow();
        return ReportResponse.from(reportRepository.save(Report.builder()
            .reporter(reporter)
            .targetType(request.targetType())
            .targetId(request.targetId())
            .reason(request.reason().strip())
            .build()));
    }
}
