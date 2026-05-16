package com.investiq.wallet.service;

import com.investiq.wallet.domain.entity.Wallet;
import com.investiq.wallet.domain.repository.TransactionRepository;
import com.investiq.wallet.domain.repository.WalletRepository;
import com.investiq.wallet.dto.response.TransactionResponse;
import com.investiq.wallet.dto.response.WalletResponse;
import com.investiq.wallet.exception.WalletNotFoundException;
import com.investiq.wallet.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    @Transactional
    public WalletResponse createWallet(UUID userId) {
        return walletRepository.findByUserId(userId)
            .map(WalletResponse::from)
            .orElseGet(() -> WalletResponse.from(
                walletRepository.save(Wallet.builder().userId(userId).build())
            ));
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(UUID walletId, AuthenticatedUser requester) {
        Wallet wallet = walletRepository.findById(walletId)
            .orElseThrow(() -> new WalletNotFoundException(walletId));
        assertAccess(wallet, requester);
        return WalletResponse.from(wallet);
    }

    @Transactional(readOnly = true)
    public WalletResponse getWalletByUserId(UUID userId, AuthenticatedUser requester) {
        if (!requester.owns(userId) && !requester.isAdmin())
            throw new AccessDeniedException("Cannot view another user's wallet");
        Wallet wallet = walletRepository.findByUserId(userId)
            .orElseThrow(() -> new WalletNotFoundException(userId));
        return WalletResponse.from(wallet);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(UUID walletId,
                                                      AuthenticatedUser requester,
                                                      Pageable pageable) {
        Wallet wallet = walletRepository.findById(walletId)
            .orElseThrow(() -> new WalletNotFoundException(walletId));
        assertAccess(wallet, requester);
        return transactionRepository.findByWalletId(walletId, pageable)
            .map(TransactionResponse::from);
    }

    private void assertAccess(Wallet wallet, AuthenticatedUser requester) {
        if (!requester.isAdmin() && !requester.userId().equals(wallet.getUserId()))
            throw new AccessDeniedException("Cannot access another user's wallet");
    }
}
