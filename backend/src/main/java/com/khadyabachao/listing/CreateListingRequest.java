package com.khadyabachao.listing;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateListingRequest(
    @NotBlank @Size(max = 255) String title,
    @Size(max = 5000) String description,
    @NotNull FoodType foodType,
    @NotNull @DecimalMin("0.01") BigDecimal quantityValue,
    @NotBlank @Size(max = 20) String quantityUnit,
    List<String> photoUrls,
    Instant preparedAt,
    @NotNull Instant pickupDeadline,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double pickupLat,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double pickupLng,
    @Size(max = 1000) String pickupAddress
) {
}
