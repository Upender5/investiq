package com.investiq.user.domain.repository;

import com.investiq.user.domain.entity.UserGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserGoalRepository extends JpaRepository<UserGoal, UUID> {
    List<UserGoal> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<UserGoal> findByIdAndUserId(UUID id, UUID userId);
}
