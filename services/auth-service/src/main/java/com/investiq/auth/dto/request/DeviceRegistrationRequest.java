package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record DeviceRegistrationRequest(
    @NotBlank String deviceToken,
    @NotBlank String deviceName,
    @NotBlank String platform,   // ANDROID | IOS | WEB
    String appVersion,
    String model
) {}
