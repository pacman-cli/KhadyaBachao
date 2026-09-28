package com.khadyabachao.listing;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record UpdateListingRequest(
    @NotBlank @Size(max = 255) String title,
    @Size(max = 5000) String description,
    @NotNull FoodType foodType,
    // Audit B26: create/update validation parity — update previously allowed 0/negative.
    @NotNull @DecimalMin("0.01") BigDecimal quantityValue,
    @NotBlank @Size(max = 20) String quantityUnit,
    // Audit D1: bound the number and size of photo URLs (was unbounded).
    @Size(max = 10) List<String> photoUrls,
    Instant preparedAt,
    @NotNull Instant pickupDeadline,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double pickupLat,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double pickupLng,
    @Size(max = 1000) String pickupAddress
) {
}
