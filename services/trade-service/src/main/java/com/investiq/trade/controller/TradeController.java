package com.investiq.trade.controller;

import com.investiq.trade.dto.request.ModifyOrderRequest;
import com.investiq.trade.dto.request.PlaceOrderRequest;
import com.investiq.trade.dto.response.*;
import com.investiq.trade.security.AuthenticatedUser;
import com.investiq.trade.service.TradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class TradeController {

    private final TradeService tradeService;

    // ─── Orders ──────────────────────────────────────────────────────────────

    @Tag(name = "Orders")
    @PostMapping("/api/v1/orders")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Place a new order (MARKET/LIMIT/SL/GTT)",
               description = "Order is asynchronous — status transitions via Kafka. Requires KYC and funded wallet.")
    public ApiResponse<OrderResponse> placeOrder(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody PlaceOrderRequest req) {
        return ApiResponse.ok(tradeService.placeOrder(user.userId(), req));
    }

    @Tag(name = "Orders")
    @GetMapping("/api/v1/orders")
    @Operation(summary = "List all orders with optional filters",
               description = "Supports ?status=EXECUTED&side=BUY&symbol=TCS&page=0&size=20&sort=createdAt,desc")
    public ApiResponse<Page<OrderResponse>> getOrders(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String side,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ApiResponse.ok(tradeService.getUserOrdersFiltered(user.userId(), status, symbol, side, pageable));
    }

    @Tag(name = "Orders")
    @GetMapping("/api/v1/orders/{orderId}")
    @Operation(summary = "Get a single order by ID")
    public ApiResponse<OrderResponse> getOrder(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable UUID orderId) {
        return ApiResponse.ok(tradeService.getOrder(user.userId(), orderId));
    }

    @Tag(name = "Orders")
    @PutMapping("/api/v1/orders/{orderId}")
    @Operation(summary = "Modify an open LIMIT order's price or quantity")
    public ApiResponse<OrderResponse> modifyOrder(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable UUID orderId,
            @Valid @RequestBody ModifyOrderRequest req) {
        return ApiResponse.ok(tradeService.modifyOrder(user.userId(), orderId, req));
    }

    @Tag(name = "Orders")
    @DeleteMapping("/api/v1/orders/{orderId}")
    @Operation(summary = "Cancel an open or pending order")
    public ApiResponse<OrderResponse> cancelOrder(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable UUID orderId) {
        return ApiResponse.ok(tradeService.cancelOrder(user.userId(), orderId));
    }

    // ─── Trade History ────────────────────────────────────────────────────────

    @Tag(name = "Trades")
    @GetMapping("/api/v1/trades")
    @Operation(summary = "List executed trades (fills)",
               description = "Supports ?symbol=TCS&from=2025-01-01&to=2025-12-31&page=0&size=20")
    public ApiResponse<Page<TradeResponse>> getTrades(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @PageableDefault(size = 20, sort = "executedAt") Pageable pageable) {
        return ApiResponse.ok(tradeService.getUserTrades(user.userId(), symbol, from, to, pageable));
    }

    // ─── Positions ────────────────────────────────────────────────────────────

    @Tag(name = "Positions")
    @GetMapping("/api/v1/positions")
    @Operation(summary = "Live open positions with real-time P&L")
    public ApiResponse<List<PositionResponse>> getPositions(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(tradeService.getPositions(user.userId()));
    }

    // ─── Margins ─────────────────────────────────────────────────────────────

    @Tag(name = "Margins")
    @GetMapping("/api/v1/margins")
    @Operation(summary = "Available cash, used margin and collateral summary")
    public ApiResponse<MarginResponse> getMargins(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(tradeService.getMargins(user.userId()));
    }
}
