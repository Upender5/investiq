package com.investiq.fund.domain.repository;

import com.investiq.fund.domain.entity.MutualFund;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MutualFundRepository extends JpaRepository<MutualFund, String> {

    @Query("""
        SELECT f FROM MutualFund f
        WHERE f.active = true
          AND (:category IS NULL OR UPPER(f.category) = UPPER(:category))
          AND (:risk IS NULL OR UPPER(f.riskLevel) = UPPER(:risk))
          AND (:amc IS NULL OR LOWER(f.amc) LIKE LOWER(CONCAT('%', :amc, '%')))
          AND (:subCategory IS NULL OR UPPER(f.subCategory) = UPPER(:subCategory))
        """)
    Page<MutualFund> findWithFilters(
        @Param("category") String category,
        @Param("risk") String risk,
        @Param("amc") String amc,
        @Param("subCategory") String subCategory,
        Pageable pageable);

    @Query("""
        SELECT f FROM MutualFund f
        WHERE f.active = true
          AND (LOWER(f.schemeName) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(f.amc) LIKE LOWER(CONCAT('%', :query, '%'))
               OR f.schemeCode = :query)
        ORDER BY f.aum DESC NULLS LAST
        """)
    List<MutualFund> searchFunds(@Param("query") String query);

    @Query("""
        SELECT f FROM MutualFund f
        WHERE f.active = true
          AND (:category IS NULL OR UPPER(f.category) = UPPER(:category))
          AND f.crisilRating IS NOT NULL
        ORDER BY f.crisilRating DESC, f.returns1y DESC NULLS LAST
        """)
    List<MutualFund> findTopRated(@Param("category") String category, Pageable pageable);
}
