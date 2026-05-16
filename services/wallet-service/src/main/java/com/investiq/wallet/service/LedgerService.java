package com.investiq.wallet.service;

import com.investiq.wallet.domain.entity.Transaction;
import com.investiq.wallet.domain.entity.Transaction.Direction;
import com.investiq.wallet.domain.entity.Transaction.TransactionStatus;
import com.investiq.wallet.domain.entity.Transaction.TransactionType;
import com.investiq.wallet.domain.entity.Wallet;
import com.investiq.wallet.domain.repository.TransactionRepository;
import com.investiq.wallet.domain.repository.WalletRepository;
import com.investiq.wallet.dto.response.TransactionResponse;
import com.investiq.wallet.event.TradeFundedEvent;
import com.investiq.wallet.exception.InsufficientFundsException;
import com.investiq.wallet.exception.WalletNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final KafkaPublisherService kafkaPublisher;

    /**
     * Records a PENDING deposit journal (two ledger entries).
     * Idempotent: returns the existing entry if idempotency_key already used.
     * Balance is NOT updated until confirmDeposit() is called.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TransactionResponse deposit(UUID walletId, BigDecimal amount,
                                       String idempotencyKey, String description,
                                       UUID referenceId) {
        return transactionRepository.findByIdempotencyKey(idempotencyKey)
            .map(TransactionResponse::from)
            .orElseGet(() -> {
                Wallet userWallet   = lockedUserWallet(walletId);
                Wallet systemFloat  = lockedSystemWallet(Wallet.WalletType.SYSTEM_FLOAT);
                UUID   journalId    = UUID.randomUUID();

                // User wallet: CREDIT (balance will increase on confirm)
                Transaction userLeg = transactionRepository.save(Transaction.builder()
                    .journalId(journalId)
                    .wallet(userWallet)
                    .direction(Direction.CREDIT)
                    .amount(amount)
                    .runningBalance(userWallet.getBalance().add(amount)) // prospective balance
                    .transactionType(TransactionType.DEPOSIT)
                    .status(TransactionStatus.PENDING)
                    .idempotencyKey(idempotencyKey)
                    .referenceId(referenceId)
                    .description(description)
                    .build());

                // System FLOAT: DEBIT (asset increases — system received real money)
                transactionRepository.save(Transaction.builder()
                    .journalId(journalId)
                    .wallet(systemFloat)
                    .direction(Direction.DEBIT)
                    .amount(amount)
                    .runningBalance(systemFloat.getBalance().add(amount))
                    .transactionType(TransactionType.DEPOSIT)
                    .status(TransactionStatus.PENDING)
                    .build());

                log.info("Deposit journal={} wallet={} amount={} PENDING", journalId, walletId, amount);
                return TransactionResponse.from(userLeg);
            });
    }

    /**
     * Settles a PENDING deposit journal, updates balances, and publishes trade.funded.
     * Safe to call multiple times — subsequent calls are no-ops if already SETTLED.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void confirmDeposit(UUID journalId) {
        List<Transaction> legs = transactionRepository.findByJournalId(journalId);
        if (legs.isEmpty()) throw new IllegalArgumentException("Journal not found: " + journalId);

        boolean alreadySettled = legs.stream()
            .allMatch(t -> t.getStatus() == TransactionStatus.SETTLED);
        if (alreadySettled) return;

        Transaction userLeg = null;
        for (Transaction leg : legs) {
            Wallet wallet = lockedWallet(leg.getWallet().getId());
            BigDecimal newBalance = wallet.applyEntry(leg.getDirection(), leg.getAmount());
            wallet.setBalance(newBalance);
            walletRepository.save(wallet);

            leg.setStatus(TransactionStatus.SETTLED);
            transactionRepository.save(leg);

            if (wallet.getUserId() != null) userLeg = leg;
        }

        if (userLeg != null) {
            kafkaPublisher.publishTradeFunded(TradeFundedEvent.of(
                userLeg.getWallet().getUserId(),
                userLeg.getWallet().getId(),
                journalId,
                userLeg.getAmount(),
                userLeg.getWallet().getCurrency()
            ));
        }

        log.info("Deposit journal={} SETTLED, trade.funded published", journalId);
    }

    /**
     * Records and immediately settles a withdrawal journal.
     * Idempotent via idempotency_key.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TransactionResponse withdraw(UUID walletId, BigDecimal amount,
                                        String idempotencyKey, String description) {
        return transactionRepository.findByIdempotencyKey(idempotencyKey)
            .map(TransactionResponse::from)
            .orElseGet(() -> {
                Wallet userWallet  = lockedUserWallet(walletId);
                Wallet systemFloat = lockedSystemWallet(Wallet.WalletType.SYSTEM_FLOAT);

                if (userWallet.getAvailableBalance().compareTo(amount) < 0) {
                    throw new InsufficientFundsException(walletId, userWallet.getAvailableBalance(), amount);
                }

                UUID journalId = UUID.randomUUID();
                BigDecimal newUserBalance   = userWallet.applyEntry(Direction.DEBIT, amount);
                BigDecimal newFloatBalance  = systemFloat.applyEntry(Direction.CREDIT, amount);

                userWallet.setBalance(newUserBalance);
                systemFloat.setBalance(newFloatBalance);
                walletRepository.save(userWallet);
                walletRepository.save(systemFloat);

                Transaction userLeg = transactionRepository.save(Transaction.builder()
                    .journalId(journalId)
                    .wallet(userWallet)
                    .direction(Direction.DEBIT)
                    .amount(amount)
                    .runningBalance(newUserBalance)
                    .transactionType(TransactionType.WITHDRAWAL)
                    .status(TransactionStatus.SETTLED)
                    .idempotencyKey(idempotencyKey)
                    .description(description)
                    .build());

                transactionRepository.save(Transaction.builder()
                    .journalId(journalId)
                    .wallet(systemFloat)
                    .direction(Direction.CREDIT)
                    .amount(amount)
                    .runningBalance(newFloatBalance)
                    .transactionType(TransactionType.WITHDRAWAL)
                    .status(TransactionStatus.SETTLED)
                    .build());

                log.info("Withdrawal journal={} wallet={} amount={} SETTLED", journalId, walletId, amount);
                return TransactionResponse.from(userLeg);
            });
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Wallet lockedUserWallet(UUID walletId) {
        Wallet w = walletRepository.findByIdForUpdate(walletId)
            .orElseThrow(() -> new WalletNotFoundException(walletId));
        if (w.getStatus() != Wallet.WalletStatus.ACTIVE)
            throw new IllegalStateException("Wallet is " + w.getStatus());
        return w;
    }

    private Wallet lockedSystemWallet(Wallet.WalletType type) {
        return walletRepository.findSystemWalletForUpdate(type)
            .orElseThrow(() -> new IllegalStateException("System wallet not found: " + type));
    }

    private Wallet lockedWallet(UUID id) {
        return walletRepository.findByIdForUpdate(id)
            .orElseThrow(() -> new WalletNotFoundException(id));
    }
}
