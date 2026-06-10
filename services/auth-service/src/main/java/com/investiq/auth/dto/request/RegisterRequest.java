package com.investiq.auth.dto.request;

import jakarta.validation.constraints.*;

public record RegisterRequest(
    @NotBlank @Size(min = 2, max = 100) String fullName,
    @NotBlank @Pattern(regexp = "^\\+91[6-9]\\d{9}$", message = "Must be a valid Indian mobile number") String phone,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 72)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
             message = "Password must contain uppercase, lowercase, digit and special character")
    String password,
    @NotBlank String referralCode
) {}
