package com.investiq.fund.domain.repository;

import com.investiq.fund.domain.entity.SipMandate;
import com.investiq.fund.domain.enums.SipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SipMandateRepository extends JpaRepository<SipMandate, UUID> {

    List<SipMandate> findByUserIdAndStatusNot(UUID userId, SipStatus status);

    Optional<SipMandate> findByIdAndUserId(UUID id, UUID userId);

    List<SipMandate> findByStatusAndNextInstalmentLessThanEqual(SipStatus status, LocalDate date);
}
