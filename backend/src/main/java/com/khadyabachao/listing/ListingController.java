package com.khadyabachao.listing;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @PostMapping
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @Valid @RequestBody CreateListingRequest request) {
        return ResponseEntity.status(201).body(listingService.create(principal.id(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ListingResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(listingService.get(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingResponse> update(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @PathVariable UUID id,
                                                  @Valid @RequestBody UpdateListingRequest request) {
        return ResponseEntity.ok(listingService.update(principal.id(), id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable UUID id) {
        listingService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingResponse> cancel(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @PathVariable UUID id) {
        return ResponseEntity.ok(listingService.cancel(principal.id(), id));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<List<ListingResponse>> mine(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(listingService.myListings(principal.id()));
    }

    /** Discovery: radius search with optional filters, sorted by distance. */
    @GetMapping("/nearby")
    public ResponseEntity<List<ListingResponse>> nearby(
        @RequestParam double lat,
        @RequestParam double lng,
        @RequestParam(defaultValue = "10") double radiusKm,
        @RequestParam(required = false) FoodType foodType,
        @RequestParam(required = false) Double minQuantity) {
        return ResponseEntity.ok(listingService.nearby(lat, lng, radiusKm, foodType, minQuantity));
    }

    /** Browse list view with pagination. */
    @GetMapping
    public ResponseEntity<Page<ListingResponse>> browse(
        @RequestParam(defaultValue = "AVAILABLE") ListingStatus status,
        @RequestParam(required = false) FoodType foodType,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
        Pageable pageable) {
        return ResponseEntity.ok(listingService.browse(status, foodType, pageable));
    }
}
