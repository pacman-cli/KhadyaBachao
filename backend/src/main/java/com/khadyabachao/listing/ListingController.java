package com.khadyabachao.listing;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import com.khadyabachao.user.UserRole;
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

@Tag(name = "Food Listings", description = "Endpoints for posting, discovering, searching, and managing food listings")
@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @Operation(summary = "Create a new food listing (Donor only)")
    @PostMapping
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @Valid @RequestBody CreateListingRequest request) {
        return ResponseEntity.status(201).body(listingService.create(principal.id(), request));
    }

    @Operation(summary = "Get listing details by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ListingResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(listingService.get(id));
    }

    @Operation(summary = "Update listing details (Donor only)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingResponse> update(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @PathVariable UUID id,
                                                  @Valid @RequestBody UpdateListingRequest request) {
        return ResponseEntity.ok(listingService.update(principal.id(), id, request));
    }

    @Operation(summary = "Delete listing (Donor only)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable UUID id) {
        listingService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Cancel listing (Donor only)")
    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingResponse> cancel(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @PathVariable UUID id) {
        return ResponseEntity.ok(listingService.cancel(principal.id(), id));
    }

    @Operation(summary = "Get current donor's posted listings")
    @GetMapping("/mine")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<List<ListingResponse>> mine(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(listingService.myListings(principal.id()));
    }

    /** Discovery: radius search with optional filters, sorted by distance. */
    @Operation(summary = "Discover nearby food listings with distance sorting and filters")
    @GetMapping("/nearby")
    public ResponseEntity<List<ListingResponse>> nearby(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @Parameter(description = "Latitude of current location", required = true)
        @RequestParam double lat,
        @Parameter(description = "Longitude of current location", required = true)
        @RequestParam double lng,
        @Parameter(description = "Maximum search distance in kilometers (alias for radiusKm)")
        @RequestParam(required = false) Double maxDistanceKm,
        @Parameter(description = "Search radius in kilometers")
        @RequestParam(required = false) Double radiusKm,
        @Parameter(description = "Filter by food type (COOKED, PACKAGED, RAW)")
        @RequestParam(required = false) FoodType foodType,
        @Parameter(description = "Filter by minimum food quantity")
        @RequestParam(required = false) Double minQuantity,
        @Parameter(description = "Filter by maximum food quantity")
        @RequestParam(required = false) Double maxQuantity,
        @Parameter(description = "Include EXPIRED listings (admin/debug use)")
        @RequestParam(defaultValue = "false") boolean includeExpired,
        @Parameter(description = "Page number (0-indexed)")
        @RequestParam(required = false) Integer page,
        @Parameter(description = "Page size limit")
        @RequestParam(required = false) Integer size) {
        // Audit B25: expired/cancelled listings are admin-only debug views —
        // ignore the flag for regular users instead of honouring it.
        boolean effectiveIncludeExpired = includeExpired && principal != null && principal.role() == UserRole.ADMIN;
        return ResponseEntity.ok(listingService.nearby(lat, lng, maxDistanceKm, radiusKm, foodType, minQuantity, maxQuantity, effectiveIncludeExpired, page, size));
    }

    /** Browse list view with pagination and filters. */
    @Operation(summary = "Browse food listings with filters and pagination")
    @GetMapping
    public ResponseEntity<Page<ListingResponse>> browse(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @Parameter(description = "Filter by listing status (defaults to AVAILABLE unless includeExpired=true)")
        @RequestParam(required = false) ListingStatus status,
        @Parameter(description = "Filter by food type (COOKED, PACKAGED, RAW)")
        @RequestParam(required = false) FoodType foodType,
        @Parameter(description = "Filter by minimum food quantity")
        @RequestParam(required = false) Double minQuantity,
        @Parameter(description = "Filter by maximum food quantity")
        @RequestParam(required = false) Double maxQuantity,
        @Parameter(description = "Include EXPIRED listings (admin/debug use)")
        @RequestParam(defaultValue = "false") boolean includeExpired,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
        Pageable pageable) {
        boolean effectiveIncludeExpired = includeExpired && principal != null && principal.role() == UserRole.ADMIN;
        return ResponseEntity.ok(listingService.browse(status, foodType, minQuantity, maxQuantity, effectiveIncludeExpired, pageable));
    }
}
