package com.investiq.user.service;

import com.investiq.user.dto.request.AddressRequest;
import com.investiq.user.dto.response.AddressResponse;

import java.util.List;
import java.util.UUID;

public interface AddressService {
    List<AddressResponse> listAddresses(UUID userId);
    AddressResponse addAddress(UUID userId, AddressRequest request);
    AddressResponse updateAddress(UUID userId, UUID addressId, AddressRequest request);
    void deleteAddress(UUID userId, UUID addressId);
}
