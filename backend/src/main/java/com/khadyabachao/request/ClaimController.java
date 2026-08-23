package com.khadyabachao.request;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;
    private final RatingService ratingService;

    public record RatingPayload(int rating, String comment) {
    }

    /** Recipient rates the donor after a completed pickup. */
    @PostMapping("/requests/{id}/rate")
    public ResponseEntity<?> rate(@AuthenticationPrincipal AuthenticatedUser principal,
                                  @PathVariable UUID id,
                                  @RequestBody RatingPayload payload) {
        ratingService.rate(id, principal.id(), new RatingService.RateRequest(payload.rating(), payload.comment()));
        return ResponseEntity.ok(java.util.Map.of("status", "rated"));
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
