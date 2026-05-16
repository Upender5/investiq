package com.investiq.auth.dto.response;

import com.investiq.auth.domain.entity.User;

import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    long accessTokenExpiresIn,
    UserInfo user
) {
    public record UserInfo(
        UUID id,
        String phone,
        String email,
        String fullName,
        User.Role role,
        User.KycStatus kycStatus
    ) {}
}
