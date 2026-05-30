package com.investiq.trade.domain.repository;

import com.investiq.trade.domain.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);
}
