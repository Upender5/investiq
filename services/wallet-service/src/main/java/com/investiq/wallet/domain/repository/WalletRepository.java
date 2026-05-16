package com.investiq.wallet.domain.repository;

import com.investiq.wallet.domain.entity.Wallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {

    Optional<Wallet> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.id = :id")
    Optional<Wallet> findByIdForUpdate(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.walletType = :type AND w.userId IS NULL")
    Optional<Wallet> findSystemWalletForUpdate(Wallet.WalletType type);

    @Query("SELECT w FROM Wallet w WHERE w.walletType = :type AND w.userId IS NULL")
    Optional<Wallet> findSystemWallet(Wallet.WalletType type);
}
