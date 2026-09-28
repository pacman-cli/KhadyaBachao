package com.khadyabachao.admin;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.khadyabachao.listing.FoodListingRepository;
import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Single owner of the Report <-> DTO mapping and report moderation actions.
 * Mapping happens inside a transaction so lazy associations (reporter) are
 * resolved with a live session instead of blowing up during JSON rendering.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final FoodListingRepository listingRepository;

    public record ReportResponse(
            UUID id,
            UUID reporterId,
            String reporterName,
            ReportTargetType targetType,
            UUID targetId,
            String reason,
            ReportStatus status,
            Instant createdAt) {

        static ReportResponse from(Report r) {
            User reporter = r.getReporter();
            return new ReportResponse(
                    r.getId(),
                    reporter != null ? reporter.getId() : null,
                    reporter != null ? reporter.getName() : null,
                    r.getTargetType(),
                    r.getTargetId(),
                    r.getReason(),
                    r.getStatus(),
                    r.getCreatedAt());
        }
    }

    @Transactional
    public ReportResponse create(UUID reporterId, ReportTargetType targetType, UUID targetId, String reason) {
        // validate target exists to avoid junk rows
        if (targetType == ReportTargetType.USER) {
            userRepository.findById(targetId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reported user not found"));
        } else if (targetType == ReportTargetType.LISTING) {
            listingRepository.findById(targetId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reported listing not found"));
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reporter not found"));
        // saveAndFlush: @CreationTimestamp only populates createdAt at insert
        // time, and the DTO below is rendered before the surrounding commit —
        // without the flush the API answered createdAt: null.
        Report saved = reportRepository.saveAndFlush(Report.builder()
                .reporter(reporter)
                .targetType(targetType)
                .targetId(targetId)
                .reason(reason.strip())
                .build());
        return ReportResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> findByStatus(ReportStatus status, Pageable pageable) {
        return reportRepository.findByStatusOrderByCreatedAtDesc(status, pageable)
                .map(ReportResponse::from);
    }

    @Transactional
    public ReportResponse setStatus(UUID id, ReportStatus status) {
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
        return ReportResponse.from(reportRepository.save(report));
    }
}
