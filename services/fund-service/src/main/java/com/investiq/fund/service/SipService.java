package com.investiq.fund.service;

import com.investiq.fund.dto.request.SipRequest;
import com.investiq.fund.dto.response.SipResponse;

import java.util.List;
import java.util.UUID;

public interface SipService {
    SipResponse createSip(UUID userId, SipRequest request);
    List<SipResponse> listSips(UUID userId);
    SipResponse getSip(UUID userId, UUID sipId);
    SipResponse updateSip(UUID userId, UUID sipId, SipRequest request);
    void cancelSip(UUID userId, UUID sipId);
}
