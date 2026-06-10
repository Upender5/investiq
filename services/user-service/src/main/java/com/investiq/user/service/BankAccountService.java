package com.investiq.user.service;

import com.investiq.user.dto.request.BankAccountRequest;
import com.investiq.user.dto.response.BankAccountResponse;

import java.util.List;
import java.util.UUID;

public interface BankAccountService {
    List<BankAccountResponse> listBankAccounts(UUID userId);
    BankAccountResponse addBankAccount(UUID userId, BankAccountRequest request);
    void deleteBankAccount(UUID userId, UUID accountId);
}
