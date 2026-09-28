package com.khadyabachao.admin;

import com.khadyabachao.listing.FoodListingRepository;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.verification.OrganizationRepository;
import com.khadyabachao.verification.VerificationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final ReportService reportService;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final FoodListingRepository listingRepository;

    @GetMapping("/reports")
    public Page<ReportService.ReportResponse> reports(
        @RequestParam(defaultValue = "OPEN") ReportStatus status,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return reportService.findByStatus(status, pageable);
    }

    @PatchMapping("/reports/{id}/resolve")
    public ReportService.ReportResponse resolve(@PathVariable java.util.UUID id) {
        return reportService.setStatus(id, ReportStatus.RESOLVED);
    }

    @PatchMapping("/reports/{id}/dismiss")
    public ReportService.ReportResponse dismiss(@PathVariable java.util.UUID id) {
        return reportService.setStatus(id, ReportStatus.DISMISSED);
    }

    @PostMapping("/users/{id}/deactivate")
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> deactivate(@PathVariable java.util.UUID id,
        @org.springframework.security.core.annotation.AuthenticationPrincipal com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser principal) {
        return setUserActive(id, false, principal.id());
    }

    @PostMapping("/users/{id}/reactivate")
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> reactivate(@PathVariable java.util.UUID id,
        @org.springframework.security.core.annotation.AuthenticationPrincipal com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser principal) {
        return setUserActive(id, true, principal.id());
    }

    private Map<String, Object> setUserActive(java.util.UUID id, boolean active, java.util.UUID callerId) {
        var user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        // Lock-out protection: deactivating yourself (or another admin) can
        // leave the platform with no working admin at all.
        if (!active) {
            if (id.equals(callerId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot deactivate your own account");
            }
            if (user.getRole() == com.khadyabachao.user.UserRole.ADMIN) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Admin accounts cannot be deactivated");
            }
        }
        user.setActive(active);
        userRepository.save(user);
        return Map.of("id", id.toString(), "active", active);
    }

    @GetMapping("/metrics")
    public Map<String, Object> metrics() {
        return Map.of(
            "usersByRole", userRepository.countByRoleGrouped(),
            "listingsByStatus", listingRepository.countByStatusGrouped(),
            "openReports", reportService.findByStatus(ReportStatus.OPEN, PageRequest.of(0, 1)).getTotalElements(),
            "pendingVerifications", organizationRepository.countByVerificationStatus(VerificationStatus.PENDING));
    }
}
