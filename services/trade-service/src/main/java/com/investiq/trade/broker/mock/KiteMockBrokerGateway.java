package com.investiq.trade.broker.mock;

import com.investiq.trade.broker.BrokerGateway;
import com.investiq.trade.broker.BrokerOrderRequest;
import com.investiq.trade.broker.BrokerOrderResult;
import com.investiq.trade.broker.BrokerOrderResult.BrokerOrderStatus;
import com.investiq.trade.domain.entity.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory mock broker. Active when app.broker.provider=mock (default).
 *
 * Behaviour:
 *  MARKET orders — immediately filled at simulated market price (base ± jitter).
 *  LIMIT  orders — filled immediately if limit price is within 1% of base price;
 *                  left OPEN otherwise (simulates partial fill / queued order).
 *
 * Base prices are seeded per symbol so repeated calls are deterministic within a run.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.broker.provider", havingValue = "mock", matchIfMissing = true)
public class KiteMockBrokerGateway implements BrokerGateway {

    private static final BigDecimal JITTER = new BigDecimal("0.005"); // ±0.5%

    // Simulated base market prices (NSE symbols → ₹)
    private static final Map<String, BigDecimal> BASE_PRICES = Map.of(
        "RELIANCE",  new BigDecimal("2450.00"),
        "TCS",       new BigDecimal("3800.00"),
        "INFY",      new BigDecimal("1600.00"),
        "HDFCBANK",  new BigDecimal("1550.00"),
        "SBIN",      new BigDecimal("620.00")
    );
    private static final BigDecimal DEFAULT_BASE = new BigDecimal("1000.00");

    private final Map<String, BrokerOrderResult> orderStore = new ConcurrentHashMap<>();

    @Override
    public BrokerOrderResult placeOrder(BrokerOrderRequest request) {
        String brokerOrderId = "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        BigDecimal marketPrice = simulatedPrice(request.symbol());

        BrokerOrderStatus status;
        BigDecimal fillPrice;

        if (request.orderType() == Order.OrderType.MARKET) {
            status    = BrokerOrderStatus.COMPLETE;
            fillPrice = marketPrice;
        } else {
            // LIMIT: fill if limit price is within 1% of market price
            BigDecimal threshold = marketPrice.multiply(new BigDecimal("0.01"));
            boolean withinMarket = request.side() == Order.TransactionSide.BUY
                ? request.price().compareTo(marketPrice.subtract(threshold)) >= 0
                : request.price().compareTo(marketPrice.add(threshold))      <= 0;

            if (withinMarket) {
                status    = BrokerOrderStatus.COMPLETE;
                fillPrice = request.price();
            } else {
                status    = BrokerOrderStatus.OPEN;
                fillPrice = BigDecimal.ZERO;
            }
        }

        BigDecimal filledQty = status == BrokerOrderStatus.COMPLETE ? request.quantity() : BigDecimal.ZERO;

        BrokerOrderResult result = new BrokerOrderResult(
            brokerOrderId, status, fillPrice, filledQty, "Mock fill");
        orderStore.put(brokerOrderId, result);

        log.info("[MOCK] Order {} {} {} {} qty={} → {} @ {}",
            brokerOrderId, request.side(), request.orderType(),
            request.symbol(), request.quantity(), status, fillPrice);
        return result;
    }

    @Override
    public void cancelOrder(String brokerOrderId) {
        orderStore.computeIfPresent(brokerOrderId, (k, v) ->
            new BrokerOrderResult(k, BrokerOrderStatus.CANCELLED,
                v.averagePrice(), v.filledQuantity(), "Cancelled"));
        log.info("[MOCK] Cancelled order {}", brokerOrderId);
    }

    @Override
    public BrokerOrderResult getOrderStatus(String brokerOrderId) {
        return orderStore.getOrDefault(brokerOrderId,
            new BrokerOrderResult(brokerOrderId, BrokerOrderStatus.REJECTED,
                BigDecimal.ZERO, BigDecimal.ZERO, "Unknown order"));
    }

    private BigDecimal simulatedPrice(String symbol) {
        BigDecimal base = BASE_PRICES.getOrDefault(symbol.toUpperCase(), DEFAULT_BASE);
        // Deterministic jitter: use symbol hashCode so same symbol always gives same price in a JVM run
        double factor = 1.0 + (symbol.hashCode() % 100) / 10_000.0;
        return base.multiply(BigDecimal.valueOf(factor)).setScale(2, RoundingMode.HALF_UP);
    }
}
