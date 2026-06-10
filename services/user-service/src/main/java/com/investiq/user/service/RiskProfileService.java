package com.investiq.user.service;

import com.investiq.user.dto.request.RiskProfileRequest;
import com.investiq.user.dto.response.RiskProfileResponse;

import java.util.UUID;

public interface RiskProfileService {
    RiskProfileResponse getProfile(UUID userId);
    RiskProfileResponse assess(UUID userId, RiskProfileRequest request);
}
