package com.investiq.user.domain.repository;

import com.investiq.user.domain.entity.UserRiskProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRiskProfileRepository extends JpaRepository<UserRiskProfile, UUID> {
    Optional<UserRiskProfile> findByUserId(UUID userId);
}
