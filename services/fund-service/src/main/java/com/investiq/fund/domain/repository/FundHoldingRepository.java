package com.investiq.fund.domain.repository;

import com.investiq.fund.domain.entity.FundHolding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FundHoldingRepository extends JpaRepository<FundHolding, UUID> {

    List<FundHolding> findByUserIdAndUnitsGreaterThan(UUID userId, java.math.BigDecimal minUnits);

    Optional<FundHolding> findByUserIdAndSchemeCodeAndFolioNumber(UUID userId, String schemeCode, String folioNumber);

    Optional<FundHolding> findFirstByUserIdAndSchemeCode(UUID userId, String schemeCode);
}
