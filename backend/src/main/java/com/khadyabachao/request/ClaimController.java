package com.khadyabachao.request;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;
    private final RatingService ratingService;
    private final ReceiptService receiptService;

    public record RatingPayload(
            @NotNull @Min(1) @Max(5) Integer rating,
            String comment) {
    }

    /** Donor or Recipient rates the other party after a completed pickup. */
    @PostMapping("/requests/{id}/rate")
    public ResponseEntity<RatingService.RatingResponse> rate(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody RatingPayload payload) {
        return ResponseEntity.ok(ratingService.rate(id, principal.id(), new RatingService.RateRequest(payload.rating(), payload.comment())));
    }

    @GetMapping("/requests/{id}/ratings")
    public ResponseEntity<List<RatingService.RatingResponse>> getRatings(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        // Audit B30: participant-only (was readable by any authenticated user).
        return ResponseEntity.ok(ratingService.getRatingsForRequest(id, principal.id()));
    }

    @GetMapping("/requests/{id}/ratings/mine")
    public ResponseEntity<RatingService.RatingResponse> getMyRating(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ratingService.getMyRatingForRequest(id, principal.id()));
    }

    @PostMapping("/listings/{id}/claim")
    @PreAuthorize("hasAnyRole('RECIPIENT_NGO','RECIPIENT_INDIVIDUAL','VOLUNTEER')")
    public ResponseEntity<RequestResponse> claim(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        return ResponseEntity.status(201).body(claimService.claim(id, principal.id()));
    }

    @GetMapping("/requests/mine")
    public ResponseEntity<List<RequestResponse>> mine(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(claimService.myRequests(principal.id()));
    }

    @GetMapping("/listings/{id}/requests")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<List<RequestResponse>> forListing(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(claimService.forMyListing(principal.id(), id));
    }

    @GetMapping("/requests/{id}/receipt")
    public ResponseEntity<byte[]> getReceipt(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        byte[] pdfBytes = receiptService.generateReceiptPdf(id, principal.id());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
            org.springframework.http.ContentDisposition.attachment().filename("receipt-" + id + ".pdf").build());
        headers.setContentLength(pdfBytes.length);
        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }

    // NOTE: there is no approve endpoint by design — claims auto-ACCEPT on
    // claim time (first-claim-wins), so a permanent-409 approve surface would
    // be misleading. Donors refuse claims via /reject below.

    @PostMapping({"/claims/{id}/reject", "/requests/{id}/reject"})
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<RequestResponse> rejectClaim(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(claimService.rejectClaim(principal.id(), id));
    }

    @PatchMapping("/requests/{id}/cancel")
    public ResponseEntity<RequestResponse> cancel(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(claimService.cancelMyClaim(principal.id(), id));
    }

    @PatchMapping("/requests/{id}/complete")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<RequestResponse> complete(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(claimService.complete(principal.id(), id));
    }
}
