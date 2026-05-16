package com.investiq.trade.broker;

/**
 * Abstraction over the underlying brokerage API.
 * Switch implementations via app.broker.provider:
 *   mock — KiteMockBrokerGateway (default, no credentials needed)
 *   kite — KiteLiveBrokerGateway (requires KITE_API_KEY + KITE_ACCESS_TOKEN)
 */
public interface BrokerGateway {

    /** Place a new order. Returns a result with the broker's order ID and fill status. */
    BrokerOrderResult placeOrder(BrokerOrderRequest request);

    /** Cancel an open order. No-op if already filled. */
    void cancelOrder(String brokerOrderId);

    /** Fetch the current status of an order from the broker. */
    BrokerOrderResult getOrderStatus(String brokerOrderId);
}
