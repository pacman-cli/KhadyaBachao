package com.khadyabachao.verification;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import com.khadyabachao.notification.NotificationService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VerificationController {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public record SubmitRequest(
        @NotBlank String orgName,
        String orgType,
        @NotBlank String registrationDocUrl) {
    }

    public record VerificationResponse(
        UUID id,
        UUID userId,
        String userName,
        String orgName,
        String orgType,
        String registrationDocUrl,
        VerificationStatus verificationStatus) {

        public static VerificationResponse from(Organization org) {
            return new VerificationResponse(
                org.getId(),
                org.getUser().getId(),
                org.getUser().getName(),
                org.getOrgName(),
                org.getOrgType(),
                org.getRegistrationDocUrl(),
                org.getVerificationStatus());
        }
    }

    /** NGO/donor submits (or resubmits) their registration document. */
    @PostMapping("/verification/submit")
    public ResponseEntity<VerificationResponse> submit(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @RequestBody SubmitRequest request) {
        User user = userRepository.findById(principal.id()).orElseThrow();

        Organization org = organizationRepository.findByUserId(user.getId())
            .orElseGet(() -> Organization.builder().user(user).build());

        org.setOrgName(request.orgName());
        org.setOrgType(request.orgType());
        org.setRegistrationDocUrl(request.registrationDocUrl());
        org.setVerificationStatus(VerificationStatus.PENDING);
        org.setVerifiedBy(null);
        org.setVerifiedAt(null);

        return ResponseEntity.ok(VerificationResponse.from(organizationRepository.save(org)));
    }

    @GetMapping("/verification/me")
    @Transactional(readOnly = true)
    public ResponseEntity<VerificationResponse> mine(@AuthenticationPrincipal AuthenticatedUser principal) {
        return organizationRepository.findByUserId(principal.id())
            .map(org -> ResponseEntity.ok(VerificationResponse.from(org)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ---------- admin ----------

    @GetMapping("/admin/verifications")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public Page<VerificationResponse> pending(
        @RequestParam(defaultValue = "PENDING") VerificationStatus status,
        @RequestParam(defaultValue = "0") int page) {
        return organizationRepository
            .findByVerificationStatus(status, org.springframework.data.domain.PageRequest.of(page, 20))
            .map(VerificationResponse::from);
    }

    @PatchMapping("/admin/verifications/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public VerificationResponse approve(@AuthenticationPrincipal AuthenticatedUser principal,
                                        @PathVariable UUID id) {
        return decide(principal.id(), id, VerificationStatus.APPROVED);
    }

    @PatchMapping("/admin/verifications/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public VerificationResponse reject(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable UUID id) {
        return decide(principal.id(), id, VerificationStatus.REJECTED);
    }

    private VerificationResponse decide(UUID adminId, UUID orgId, VerificationStatus decision) {
        Organization org = organizationRepository.findById(orgId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        org.setVerificationStatus(decision);
        org.setVerifiedBy(userRepository.getReferenceById(adminId));
        org.setVerifiedAt(Instant.now());
        organizationRepository.save(org);

        User applicant = org.getUser();
        boolean approved = decision == VerificationStatus.APPROVED;
        applicant.setVerified(approved || applicant.isVerified());
        userRepository.save(applicant);

        notificationService.sendToUsers(
            List.of(applicant.getId()),
            approved ? "You're verified!" : "Verification update",
            approved
                ? "Your organization \"" + org.getOrgName() + "\" was verified."
                : "Your verification for \"" + org.getOrgName() + "\" was rejected. You can resubmit.",
            Map.of("type", "VERIFICATION"));

        return VerificationResponse.from(org);
    }
}
