package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyOtpRequest(
        @NotBlank(message = "Phone number is required") @Pattern(regexp = "^(\\+91)?[6-9]\\d{9}$", message = "Invalid Indian mobile number") String phone,

        @NotBlank(message = "OTP is required") @Size(min = 6, max = 6, message = "OTP must be exactly 6 digits") @Pattern(regexp = "\\d{6}", message = "OTP must contain only digits") String otp) {
}
