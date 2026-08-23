package com.khadyabachao.admin;

import com.khadyabachao.listing.FoodListingRepository;
import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.verification.OrganizationRepository;
import com.khadyabachao.verification.VerificationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final FoodListingRepository listingRepository;

    @GetMapping("/reports")
    public Page<ReportController.ReportResponse> reports(
        @RequestParam(defaultValue = "OPEN") ReportStatus status,
        @RequestParam(defaultValue = "0") int page) {
        return reportRepository
            .findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, 20))
            .map(ReportController.ReportResponse::from);
    }

    @PatchMapping("/reports/{id}/resolve")
    @org.springframework.transaction.annotation.Transactional
    public ReportController.ReportResponse resolve(@PathVariable java.util.UUID id) {
        return setReportStatus(id, ReportStatus.RESOLVED);
    }

    @PatchMapping("/reports/{id}/dismiss")
    @org.springframework.transaction.annotation.Transactional
    public ReportController.ReportResponse dismiss(@PathVariable java.util.UUID id) {
        return setReportStatus(id, ReportStatus.DISMISSED);
    }

    private ReportController.ReportResponse setReportStatus(java.util.UUID id, ReportStatus status) {
        Report report = reportRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        report.setStatus(status);
        if (status == ReportStatus.RESOLVED && report.getTargetType() == ReportTargetType.LISTING) {
            listingRepository.findById(report.getTargetId()).ifPresent(l -> {
                if (l.getStatus() == ListingStatus.AVAILABLE || l.getStatus() == ListingStatus.CLAIMED) {
                    l.setStatus(ListingStatus.CANCELLED);
                    listingRepository.save(l);
                }
            });
        }
        return ReportController.ReportResponse.from(reportRepository.save(report));
    }

    @PostMapping("/users/{id}/deactivate")
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> deactivate(@PathVariable java.util.UUID id) {
        return setUserActive(id, false);
    }

    @PostMapping("/users/{id}/reactivate")
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> reactivate(@PathVariable java.util.UUID id) {
        return setUserActive(id, true);
    }

    private Map<String, Object> setUserActive(java.util.UUID id, boolean active) {
        var user = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(active);
        userRepository.save(user);
        return Map.of("id", id.toString(), "active", active);
    }

    @GetMapping("/metrics")
    public Map<String, Object> metrics() {
        return Map.of(
            "usersByRole", userRepository.countByRoleGrouped(),
            "listingsByStatus", listingRepository.countByStatusGrouped(),
            "openReports", reportRepository.findByStatusOrderByCreatedAtDesc(ReportStatus.OPEN, PageRequest.of(0, 1)).getTotalElements(),
            "pendingVerifications", organizationRepository.countByVerificationStatus(VerificationStatus.PENDING));
    }
}
