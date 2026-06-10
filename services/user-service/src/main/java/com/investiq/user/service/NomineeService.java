package com.investiq.user.service;

import com.investiq.user.dto.request.NomineeRequest;
import com.investiq.user.dto.response.NomineeResponse;

import java.util.List;
import java.util.UUID;

public interface NomineeService {
    List<NomineeResponse> listNominees(UUID userId);
    NomineeResponse addNominee(UUID userId, NomineeRequest request);
    void deleteNominee(UUID userId, UUID nomineeId);
}
