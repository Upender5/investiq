package com.investiq.user.domain.repository;

import com.investiq.user.domain.entity.UserNominee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserNomineeRepository extends JpaRepository<UserNominee, UUID> {
    List<UserNominee> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<UserNominee> findByIdAndUserId(UUID id, UUID userId);
}
