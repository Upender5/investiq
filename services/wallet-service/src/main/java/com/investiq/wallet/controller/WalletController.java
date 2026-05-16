package com.investiq.wallet.controller;

import com.investiq.wallet.dto.request.DepositRequest;
import com.investiq.wallet.dto.request.WithdrawRequest;
import com.investiq.wallet.dto.response.TransactionResponse;
import com.investiq.wallet.dto.response.WalletResponse;
import com.investiq.wallet.security.AuthenticatedUser;
import com.investiq.wallet.service.LedgerService;
import com.investiq.wallet.service.WalletService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final LedgerService ledgerService;

    /** POST /api/v1/wallets — provision a new wallet for the authenticated user. */
    @PostMapping
    public ResponseEntity<WalletResponse> create(@AuthenticationPrincipal AuthenticatedUser requester) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(walletService.createWallet(requester.userId()));
    }

    /** GET /api/v1/wallets/{walletId} — get wallet balance. */
    @GetMapping("/{walletId}")
    public ResponseEntity<WalletResponse> getWallet(
        @PathVariable UUID walletId,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        return ResponseEntity.ok(walletService.getWallet(walletId, requester));
    }

    /** GET /api/v1/wallets/by-user/{userId} — get wallet for a given userId. */
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<WalletResponse> getByUser(
        @PathVariable UUID userId,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        return ResponseEntity.ok(walletService.getWalletByUserId(userId, requester));
    }

    /** GET /api/v1/wallets/{walletId}/transactions — paginated ledger history. */
    @GetMapping("/{walletId}/transactions")
    public ResponseEntity<Page<TransactionResponse>> getTransactions(
        @PathVariable UUID walletId,
        @AuthenticationPrincipal AuthenticatedUser requester,
        @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return ResponseEntity.ok(walletService.getTransactions(walletId, requester, pageable));
    }

    /**
     * POST /api/v1/wallets/{walletId}/deposit
     * Creates a PENDING deposit journal. Requires Idempotency-Key header.
     * Call /deposit/{journalId}/confirm to settle and publish trade.funded.
     */
    @PostMapping("/{walletId}/deposit")
    public ResponseEntity<TransactionResponse> deposit(
        @PathVariable UUID walletId,
        @Valid @RequestBody DepositRequest request,
        @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 128) String idempotencyKey,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        walletService.getWallet(walletId, requester); // access check
        TransactionResponse response = ledgerService.deposit(
            walletId, request.amount(), idempotencyKey,
            request.description(), request.referenceId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * POST /api/v1/wallets/{walletId}/deposit/{journalId}/confirm
     * Settles a pending deposit and publishes trade.funded Kafka event.
     * In production this is called by a payment-gateway webhook handler.
     */
    @PostMapping("/{walletId}/deposit/{journalId}/confirm")
    public ResponseEntity<Void> confirmDeposit(
        @PathVariable UUID walletId,
        @PathVariable UUID journalId,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        walletService.getWallet(walletId, requester); // access check
        ledgerService.confirmDeposit(journalId);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/v1/wallets/{walletId}/withdraw
     * Creates and immediately settles a withdrawal. Requires Idempotency-Key header.
     */
    @PostMapping("/{walletId}/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(
        @PathVariable UUID walletId,
        @Valid @RequestBody WithdrawRequest request,
        @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 128) String idempotencyKey,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        walletService.getWallet(walletId, requester); // access check
        return ResponseEntity.ok(
            ledgerService.withdraw(walletId, request.amount(), idempotencyKey, request.description())
        );
    }
}
