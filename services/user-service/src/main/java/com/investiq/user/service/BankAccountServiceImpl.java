package com.investiq.user.service;

import com.investiq.user.domain.entity.UserBankAccount;
import com.investiq.user.domain.repository.UserBankAccountRepository;
import com.investiq.user.dto.request.BankAccountRequest;
import com.investiq.user.dto.response.BankAccountResponse;
import com.investiq.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BankAccountServiceImpl implements BankAccountService {

    private final UserBankAccountRepository bankAccountRepository;

    @Override
    public List<BankAccountResponse> listBankAccounts(UUID userId) {
        return bankAccountRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public BankAccountResponse addBankAccount(UUID userId, BankAccountRequest request) {
        if (request.isPrimary()) {
            bankAccountRepository.clearPrimary(userId);
        }
        UserBankAccount account = UserBankAccount.builder()
                .userId(userId)
                .accountHolderName(request.accountHolderName())
                .accountNumber(request.accountNumber())
                .ifscCode(request.ifscCode())
                .bankName(request.bankName())
                .branchName(request.branchName())
                .accountType(request.accountType())
                .primary(request.isPrimary())
                .verified(false)
                .build();
        return toResponse(bankAccountRepository.save(account));
    }

    @Override
    @Transactional
    public void deleteBankAccount(UUID userId, UUID accountId) {
        UserBankAccount account = bankAccountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new UserNotFoundException("Bank account not found"));
        bankAccountRepository.delete(account);
    }

    private BankAccountResponse toResponse(UserBankAccount a) {
        String masked = maskAccountNumber(a.getAccountNumber());
        return new BankAccountResponse(a.getId(), a.getAccountHolderName(), masked,
                a.getIfscCode(), a.getBankName(), a.getBranchName(), a.getAccountType(),
                a.isPrimary(), a.isVerified(), a.getCreatedAt());
    }

    private String maskAccountNumber(String number) {
        if (number == null || number.length() <= 4) return number;
        return "X".repeat(number.length() - 4) + number.substring(number.length() - 4);
    }
}
