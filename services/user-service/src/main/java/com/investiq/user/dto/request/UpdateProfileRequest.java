package com.investiq.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequest(
    @Size(min = 2, max = 100) String fullName,
    @Email String email,
    @Past LocalDate dateOfBirth,
    String gender,
    String occupation,
    String annualIncome
) {}
