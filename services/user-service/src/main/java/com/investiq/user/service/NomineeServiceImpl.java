package com.investiq.user.service;

import com.investiq.user.domain.entity.UserNominee;
import com.investiq.user.domain.repository.UserNomineeRepository;
import com.investiq.user.dto.request.NomineeRequest;
import com.investiq.user.dto.response.NomineeResponse;
import com.investiq.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NomineeServiceImpl implements NomineeService {

    private final UserNomineeRepository nomineeRepository;

    @Override
    public List<NomineeResponse> listNominees(UUID userId) {
        return nomineeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public NomineeResponse addNominee(UUID userId, NomineeRequest request) {
        UserNominee nominee = UserNominee.builder()
                .userId(userId)
                .name(request.name())
                .relationship(request.relationship())
                .dateOfBirth(request.dateOfBirth())
                .phone(request.phone())
                .sharePercentage(request.sharePercentage())
                .build();
        return toResponse(nomineeRepository.save(nominee));
    }

    @Override
    @Transactional
    public void deleteNominee(UUID userId, UUID nomineeId) {
        UserNominee nominee = nomineeRepository.findByIdAndUserId(nomineeId, userId)
                .orElseThrow(() -> new UserNotFoundException("Nominee not found"));
        nomineeRepository.delete(nominee);
    }

    private NomineeResponse toResponse(UserNominee n) {
        String maskedPhone = n.getPhone() != null ? maskPhone(n.getPhone()) : null;
        return new NomineeResponse(n.getId(), n.getName(), n.getRelationship(),
                n.getDateOfBirth(), maskedPhone, n.getSharePercentage(), n.getCreatedAt());
    }

    private String maskPhone(String phone) {
        if (phone.length() <= 4) return phone;
        return "XXXXXX" + phone.substring(phone.length() - 4);
    }
}
