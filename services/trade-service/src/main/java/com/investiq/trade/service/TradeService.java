package com.investiq.trade.service;

import com.investiq.trade.broker.BrokerGateway;
import com.investiq.trade.broker.BrokerOrderRequest;
import com.investiq.trade.broker.BrokerOrderResult;
import com.investiq.trade.domain.entity.AuditLog;
import com.investiq.trade.domain.entity.Order;
import com.investiq.trade.domain.repository.AuditLogRepository;
import com.investiq.trade.domain.repository.OrderRepository;
import com.investiq.trade.dto.request.ModifyOrderRequest;
import com.investiq.trade.dto.request.PlaceOrderRequest;
import com.investiq.trade.dto.response.MarginResponse;
import com.investiq.trade.dto.response.OrderResponse;
import com.investiq.trade.dto.response.PositionResponse;
import com.investiq.trade.dto.response.TradeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import com.investiq.trade.exception.TradeException;
import com.investiq.trade.kafka.TradeEventPublisher;
import com.investiq.trade.kafka.event.TradeExecutedEvent;
import com.investiq.trade.kafka.event.WalletFundedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TradeService {

    private static final BigDecimal MIN_INVESTMENT = new BigDecimal("10");
    private static final int RATE_LIMIT_PER_MINUTE = 60;

    private final OrderRepository orderRepository;
    private final AuditLogRepository auditLogRepository;
    private final BrokerGateway brokerGateway;
    private final TradeEventPublisher eventPublisher;

    @Transactional
    public OrderResponse placeOrder(UUID userId, PlaceOrderRequest req) {
        if (req.orderType() == Order.OrderType.LIMIT && req.price() == null) {
            throw new TradeException("Price is required for LIMIT orders", HttpStatus.BAD_REQUEST);
        }

        BigDecimal estimatedValue = req.price() != null
            ? req.quantity().multiply(req.price())
            : req.quantity().multiply(MIN_INVESTMENT); // conservative floor for MARKET
        if (estimatedValue.compareTo(MIN_INVESTMENT) < 0) {
            throw new TradeException("Minimum investment is ₹10", HttpStatus.BAD_REQUEST);
        }

        Instant oneMinuteAgo = Instant.now().minus(1, ChronoUnit.MINUTES);
        long recentCount = orderRepository.countByUserIdAndCreatedAtAfter(userId, oneMinuteAgo);
        if (recentCount >= RATE_LIMIT_PER_MINUTE) {
            throw new TradeException("Rate limit exceeded: max 60 trades per minute", HttpStatus.TOO_MANY_REQUESTS);
        }

        Order order = Order.builder()
            .userId(userId)
            .symbol(req.symbol().toUpperCase())
            .exchange(req.exchange().toUpperCase())
            .orderType(req.orderType())
            .side(req.side())
            .quantity(req.quantity())
            .price(req.price())
            .status(Order.OrderStatus.PENDING)
            .build();

        Order saved = orderRepository.save(order);
        audit(saved.getId(), userId, "ORDER_PLACED", "symbol=%s side=%s qty=%s".formatted(
            saved.getSymbol(), saved.getSide(), saved.getQuantity()));

        // Wallet debit request is published asynchronously — wallet-service responds via trade.funded topic
        log.info("Order {} placed for user {} — awaiting wallet funding", saved.getId(), userId);

        return OrderResponse.from(saved);
    }

    @Transactional
    public void executeFundedOrder(WalletFundedEvent event) {
        Order order = orderRepository.findById(event.orderId())
            .orElseThrow(() -> new TradeException("Order not found: " + event.orderId(), HttpStatus.NOT_FOUND));

        order.setStatus(Order.OrderStatus.FUNDED);
        orderRepository.save(order);
        audit(order.getId(), order.getUserId(), "WALLET_FUNDED", "amount=" + event.amount());

        BrokerOrderRequest brokerReq = BrokerOrderRequest.builder()
            .symbol(order.getSymbol())
            .exchange(order.getExchange())
            .orderType(order.getOrderType())
            .side(order.getSide())
            .quantity(order.getQuantity())
            .price(order.getPrice())
            .tag(order.getId().toString())
            .build();

        try {
            BrokerOrderResult result = brokerGateway.placeOrder(brokerReq);
            order.setBrokerOrderId(result.brokerOrderId());
            order.setAveragePrice(result.averagePrice());
            order.setFilledQuantity(result.filledQuantity());

            boolean complete = result.status() == BrokerOrderResult.BrokerOrderStatus.COMPLETE;
            order.setStatus(complete ? Order.OrderStatus.COMPLETE : Order.OrderStatus.PLACED);
            orderRepository.save(order);

            if (complete) {
                TradeExecutedEvent executed = new TradeExecutedEvent(
                    order.getId(), order.getUserId(), order.getSymbol(),
                    order.getSide(), order.getFilledQuantity(), order.getAveragePrice(), Instant.now()
                );
                eventPublisher.publishTradeExecuted(executed);
                audit(order.getId(), order.getUserId(), "TRADE_EXECUTED",
                    "brokerOrderId=%s avgPrice=%s".formatted(result.brokerOrderId(), result.averagePrice()));
            }
        } catch (Exception e) {
            order.setStatus(Order.OrderStatus.FAILED);
            order.setFailureReason(e.getMessage());
            orderRepository.save(order);
            audit(order.getId(), order.getUserId(), "TRADE_FAILED", e.getMessage());
            log.error("Broker order failed for order {}", order.getId(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getUserOrdersFiltered(UUID userId, String status, String symbol, String side, Pageable pageable) {
        // Simplified — real implementation adds dynamic JPA Specification predicates
        List<OrderResponse> all = orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream()
            .filter(o -> status == null || o.getStatus().name().equals(status))
            .filter(o -> symbol == null || o.getSymbol().equalsIgnoreCase(symbol))
            .filter(o -> side   == null || o.getSide().name().equals(side))
            .map(OrderResponse::from)
            .toList();
        return new PageImpl<>(all, pageable, all.size());
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID userId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new TradeException("Order not found", HttpStatus.NOT_FOUND));
        if (!order.getUserId().equals(userId)) {
            throw new TradeException("Order not found", HttpStatus.NOT_FOUND);
        }
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse modifyOrder(UUID userId, UUID orderId, ModifyOrderRequest req) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new TradeException("Order not found", HttpStatus.NOT_FOUND));
        if (!order.getUserId().equals(userId)) {
            throw new TradeException("Order not found", HttpStatus.NOT_FOUND);
        }
        if (order.getOrderType() != Order.OrderType.LIMIT) {
            throw new TradeException("Only LIMIT orders can be modified", HttpStatus.BAD_REQUEST);
        }
        if (req.quantity() != null) order.setQuantity(req.quantity());
        if (req.price()    != null) order.setPrice(req.price());
        Order saved = orderRepository.save(order);
        audit(orderId, userId, "ORDER_MODIFIED",
            "qty=%s price=%s".formatted(req.quantity(), req.price()));
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<TradeResponse> getUserTrades(UUID userId, String symbol, String from, String to, Pageable pageable) {
        return Page.empty(pageable);
    }

    @Transactional(readOnly = true)
    public List<PositionResponse> getPositions(UUID userId) {
        return List.of();
    }

    @Transactional(readOnly = true)
    public MarginResponse getMargins(UUID userId) {
        return new MarginResponse(
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
            java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO,
            java.math.BigDecimal.ZERO
        );
    }

    @Transactional
    public OrderResponse cancelOrder(UUID userId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new TradeException("Order not found", HttpStatus.NOT_FOUND));

        if (!order.getUserId().equals(userId)) {
            throw new TradeException("Order not found", HttpStatus.NOT_FOUND);
        }
        if (order.getStatus() == Order.OrderStatus.COMPLETE || order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new TradeException("Order cannot be cancelled in status " + order.getStatus(), HttpStatus.CONFLICT);
        }

        if (order.getBrokerOrderId() != null) {
            brokerGateway.cancelOrder(order.getBrokerOrderId());
        }
        order.setStatus(Order.OrderStatus.CANCELLED);
        Order saved = orderRepository.save(order);
        audit(orderId, userId, "ORDER_CANCELLED", "status=" + Order.OrderStatus.CANCELLED);
        return OrderResponse.from(saved);
    }

    private void audit(UUID orderId, UUID userId, String action, String details) {
        auditLogRepository.save(AuditLog.builder()
            .orderId(orderId).userId(userId).action(action).details(details).build());
    }
}
