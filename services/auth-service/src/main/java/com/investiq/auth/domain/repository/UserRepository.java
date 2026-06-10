package com.investiq.auth.domain.repository;

import com.investiq.auth.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByPhone(String phone);
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneOrEmail(String phone, String email);
    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);
}
