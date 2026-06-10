package com.investiq.user.service;

import com.investiq.user.domain.entity.UserProfile;
import com.investiq.user.domain.repository.UserProfileRepository;
import com.investiq.user.dto.request.UpdateProfileRequest;
import com.investiq.user.dto.response.UserProfileResponse;
import com.investiq.user.exception.UserNotFoundException;
import com.investiq.user.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserProfileRepository userProfileRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID targetId, AuthenticatedUser requester) {
        if (!requester.owns(targetId) && !requester.isAdmin()) {
            throw new AccessDeniedException("Cannot view another user's profile");
        }
        UserProfile profile = userProfileRepository.findById(targetId)
            .orElseThrow(() -> new UserNotFoundException(targetId));
        return UserProfileResponse.from(profile);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID targetId, UpdateProfileRequest request, AuthenticatedUser requester) {
        if (!requester.owns(targetId)) {
            throw new AccessDeniedException("Cannot update another user's profile");
        }
        UserProfile profile = userProfileRepository.findById(targetId)
            .orElseThrow(() -> new UserNotFoundException(targetId));
        if (request.fullName()  != null) profile.setFullName(request.fullName());
        if (request.email()     != null) profile.setEmail(request.email());
        if (request.dateOfBirth() != null) profile.setDateOfBirth(request.dateOfBirth());
        return UserProfileResponse.from(userProfileRepository.save(profile));
    }

    // Called internally (e.g., from KYCService on first document submission)
    @Transactional
    public UserProfile findOrCreate(UUID userId, String phone) {
        return userProfileRepository.findById(userId)
            .orElseGet(() -> userProfileRepository.save(
                UserProfile.builder().id(userId).phone(phone).build()
            ));
    }
}
