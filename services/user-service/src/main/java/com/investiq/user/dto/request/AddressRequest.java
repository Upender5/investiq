package com.investiq.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AddressRequest(
    @NotBlank String type,          // HOME | WORK | OTHER
    @NotBlank String line1,
    String line2,
    @NotBlank String city,
    @NotBlank String state,
    @NotBlank @Pattern(regexp = "^[1-9][0-9]{5}$") String pincode,
    @NotBlank String country,
    boolean isPrimary
) {}
