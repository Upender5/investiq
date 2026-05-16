package com.investiq.trade.broker.kite;

import com.fasterxml.jackson.databind.JsonNode;
import com.investiq.trade.broker.BrokerGateway;
import com.investiq.trade.broker.BrokerOrderRequest;
import com.investiq.trade.broker.BrokerOrderResult;
import com.investiq.trade.broker.BrokerOrderResult.BrokerOrderStatus;
import com.investiq.trade.domain.entity.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Live Zerodha Kite Connect broker gateway.
 * Activated when app.broker.provider=kite.
 *
 * Authentication: Kite Connect requires a daily access token obtained via OAuth.
 *   1. Generate login URL: https://kite.trade/connect/login?api_key=xxx&v=3
 *   2. User logs in → Kite redirects to your callback with request_token
 *   3. Exchange request_token for access_token via POST /session/token
 *   4. Set KITE_ACCESS_TOKEN env var (refresh daily or automate via scheduled job)
 *
 * NOTE: Zerodha does not support fractional quantities.
 *       Fractional qty is rounded to the nearest integer when calling Kite.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.broker.provider", havingValue = "kite")
public class KiteLiveBrokerGateway implements BrokerGateway {

    private static final String VARIETY_REGULAR = "regular";
    private static final String PRODUCT_CNC     = "CNC";  // cash-and-carry (delivery)
    private static final String VALIDITY_DAY    = "DAY";

    private final RestClient restClient;
    private final String apiKey;

    public KiteLiveBrokerGateway(
        @Value("${app.broker.kite.base-url}") String baseUrl,
        @Value("${app.broker.kite.api-key}") String apiKey,
        @Value("${app.broker.kite.access-token}") String accessToken
    ) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("X-Kite-Version", "3")
            .defaultHeader("Authorization", "token " + apiKey + ":" + accessToken)
            .build();
    }

    @Override
    public BrokerOrderResult placeOrder(BrokerOrderRequest request) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("tradingsymbol",    request.symbol());
        form.add("exchange",         request.exchange());
        form.add("transaction_type", request.side().name());
        form.add("order_type",       request.orderType().name());
        // Kite requires integer quantity — fractional rounded up to avoid under-fill
        form.add("quantity", String.valueOf(
            request.quantity().setScale(0, RoundingMode.CEILING).intValue()));
        form.add("product",          PRODUCT_CNC);
        form.add("validity",         VALIDITY_DAY);
        form.add("tag",              request.tag());

        if (request.orderType() == Order.OrderType.LIMIT && request.price() != null) {
            form.add("price", request.price().toPlainString());
        }

        JsonNode response = restClient.post()
            .uri("/orders/" + VARIETY_REGULAR)
            .body(form)
            .retrieve()
            .body(JsonNode.class);

        String brokerOrderId = response.path("data").path("order_id").asText();
        log.info("[KITE] Placed order {} for {} {}", brokerOrderId, request.side(), request.symbol());

        // Kite returns only order_id on placement; status is fetched separately
        return new BrokerOrderResult(brokerOrderId, BrokerOrderStatus.OPEN,
            BigDecimal.ZERO, BigDecimal.ZERO, "Order placed");
    }

    @Override
    public void cancelOrder(String brokerOrderId) {
        restClient.delete()
            .uri("/orders/" + VARIETY_REGULAR + "/" + brokerOrderId)
            .retrieve()
            .toBodilessEntity();
        log.info("[KITE] Cancelled order {}", brokerOrderId);
    }

    @Override
    public BrokerOrderResult getOrderStatus(String brokerOrderId) {
        JsonNode data = restClient.get()
            .uri("/orders/" + brokerOrderId)
            .retrieve()
            .body(JsonNode.class)
            .path("data")
            .path(0);

        String kiteStatus = data.path("status").asText();
        BigDecimal avgPrice  = new BigDecimal(data.path("average_price").asText("0"));
        BigDecimal filledQty = new BigDecimal(data.path("filled_quantity").asText("0"));

        return new BrokerOrderResult(
            brokerOrderId,
            mapStatus(kiteStatus),
            avgPrice,
            filledQty,
            data.path("status_message").asText()
        );
    }

    private BrokerOrderStatus mapStatus(String kiteStatus) {
        return switch (kiteStatus.toUpperCase()) {
            case "COMPLETE"  -> BrokerOrderStatus.COMPLETE;
            case "CANCELLED" -> BrokerOrderStatus.CANCELLED;
            case "REJECTED"  -> BrokerOrderStatus.REJECTED;
            default          -> BrokerOrderStatus.OPEN;
        };
    }
}
