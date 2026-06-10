package com.investiq.fund.domain.repository;

import com.investiq.fund.domain.entity.FundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FundTransactionRepository extends JpaRepository<FundTransaction, UUID> {

    List<FundTransaction> findByUserIdAndSchemeCodeOrderByCreatedAtAsc(UUID userId, String schemeCode);

    List<FundTransaction> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<FundTransaction> findBySipMandateId(UUID sipMandateId);
}
