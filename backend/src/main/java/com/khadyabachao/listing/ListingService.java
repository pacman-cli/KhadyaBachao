package com.khadyabachao.listing;

import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListingService {

    private final FoodListingRepository listingRepository;
    private final UserRepository userRepository;
    private final ListingEventPublisher eventPublisher;

    @Transactional
    public ListingResponse create(UUID donorId, CreateListingRequest request) {
        if (!request.pickupDeadline().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup deadline must be in the future");
        }

        var donor = userRepository.findById(donorId).orElseThrow();
        if (donor.getRole() != UserRole.DONOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only donors can create listings");
        }

        FoodListing listing = FoodListing.builder()
            .donor(donor)
            .title(request.title())
            .description(request.description())
            .foodType(request.foodType())
            .quantityValue(request.quantityValue())
            .quantityUnit(request.quantityUnit())
            .photoUrls(request.photoUrls() != null ? request.photoUrls() : List.of())
            .preparedAt(request.preparedAt())
            .pickupDeadline(request.pickupDeadline())
            .pickupLat(request.pickupLat())
            .pickupLng(request.pickupLng())
            .pickupAddress(request.pickupAddress())
            .build();

        FoodListing saved = listingRepository.save(listing);
        eventPublisher.listingChanged(saved.getId(), "CREATED", saved.getStatus());
        return ListingResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public ListingResponse get(UUID id) {
        return listingRepository.findById(id)
            .map(ListingResponse::from)
            .orElseThrow(() -> notFound());
    }

    @Transactional
    public ListingResponse update(UUID userId, UUID id, UpdateListingRequest request) {
        FoodListing listing = ownedListing(userId, id);
        if (listing.getStatus() == ListingStatus.COMPLETED || listing.getStatus() == ListingStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing can no longer be edited");
        }
        if (!request.pickupDeadline().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup deadline must be in the future");
        }

        listing.setTitle(request.title());
        listing.setDescription(request.description());
        listing.setFoodType(request.foodType());
        listing.setQuantityValue(request.quantityValue());
        listing.setQuantityUnit(request.quantityUnit());
        listing.setPhotoUrls(request.photoUrls() != null ? request.photoUrls() : List.of());
        listing.setPreparedAt(request.preparedAt());
        listing.setPickupDeadline(request.pickupDeadline());
        listing.setPickupLat(request.pickupLat());
        listing.setPickupLng(request.pickupLng());
        listing.setPickupAddress(request.pickupAddress());

        // a past-deadline listing that is being refreshed becomes available again
        if (listing.getStatus() == ListingStatus.EXPIRED && request.pickupDeadline().isAfter(Instant.now())) {
            listing.setStatus(ListingStatus.AVAILABLE);
        }
        return ListingResponse.from(listingRepository.save(listing));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        FoodListing listing = ownedListing(userId, id);
        listingRepository.delete(listing);
    }

    @Transactional
    public ListingResponse cancel(UUID userId, UUID id) {
        FoodListing listing = ownedListing(userId, id);
        if (listing.getStatus() == ListingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Completed listings cannot be cancelled");
        }
        listing.setStatus(ListingStatus.CANCELLED);
        ListingResponse response = ListingResponse.from(listingRepository.save(listing));
        eventPublisher.listingChanged(listing.getId(), "CANCELLED", ListingStatus.CANCELLED);
        return response;
    }

    @Transactional(readOnly = true)
    public List<ListingResponse> myListings(UUID donorId) {
        return listingRepository.findByDonorIdOrderByCreatedAtDesc(donorId).stream()
            .map(ListingResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ListingResponse> nearby(double lat, double lng, double radiusKm,
                                        FoodType foodType, Double minQuantity) {
        double radiusMeters = Math.max(0.1, Math.min(radiusKm, 100)) * 1000;
        return listingRepository
            .findNearby(lat, lng, radiusMeters,
                foodType != null ? foodType.name() : null, minQuantity)
            .stream()
            .map(ListingResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<ListingResponse> browse(ListingStatus status, FoodType foodType, Pageable pageable) {
        var page = foodType != null
            ? listingRepository.findByStatusAndFoodType(status, foodType, pageable)
            : listingRepository.findByStatus(status, pageable);
        return page.map(ListingResponse::from);
    }

    private FoodListing ownedListing(UUID userId, UUID id) {
        FoodListing listing = listingRepository.findById(id).orElseThrow(() -> notFound());
        if (!listing.getDonor().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        return listing;
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found");
    }
}
