package com.investiq.trade.controller;

import com.investiq.trade.dto.request.PlaceOrderRequest;
import com.investiq.trade.dto.response.OrderResponse;
import com.investiq.trade.security.AuthenticatedUser;
import com.investiq.trade.service.TradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public OrderResponse placeOrder(@AuthenticationPrincipal AuthenticatedUser user,
                                    @Valid @RequestBody PlaceOrderRequest req) {
        return tradeService.placeOrder(user.userId(), req);
    }

    @GetMapping
    public List<OrderResponse> getOrders(@AuthenticationPrincipal AuthenticatedUser user) {
        return tradeService.getUserOrders(user.userId());
    }

    @DeleteMapping("/{orderId}")
    public OrderResponse cancelOrder(@AuthenticationPrincipal AuthenticatedUser user,
                                     @PathVariable UUID orderId) {
        return tradeService.cancelOrder(user.userId(), orderId);
    }
}
