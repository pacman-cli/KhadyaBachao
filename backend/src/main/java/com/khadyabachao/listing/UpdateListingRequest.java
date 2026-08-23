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
    @NotNull BigDecimal quantityValue,
    @NotBlank @Size(max = 20) String quantityUnit,
    List<String> photoUrls,
    Instant preparedAt,
    @NotNull Instant pickupDeadline,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double pickupLat,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double pickupLng,
    @Size(max = 1000) String pickupAddress
) {
}
