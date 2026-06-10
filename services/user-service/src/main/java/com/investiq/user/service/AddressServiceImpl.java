package com.investiq.user.service;

import com.investiq.user.domain.entity.UserAddress;
import com.investiq.user.domain.repository.UserAddressRepository;
import com.investiq.user.dto.request.AddressRequest;
import com.investiq.user.dto.response.AddressResponse;
import com.investiq.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final UserAddressRepository addressRepository;

    @Override
    public List<AddressResponse> listAddresses(UUID userId) {
        return addressRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public AddressResponse addAddress(UUID userId, AddressRequest request) {
        if (request.isPrimary()) {
            addressRepository.clearPrimary(userId);
        }
        UserAddress address = UserAddress.builder()
                .userId(userId)
                .type(request.type())
                .line1(request.line1())
                .line2(request.line2())
                .city(request.city())
                .state(request.state())
                .pincode(request.pincode())
                .country(request.country() != null ? request.country() : "India")
                .primary(request.isPrimary())
                .build();
        return toResponse(addressRepository.save(address));
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(UUID userId, UUID addressId, AddressRequest request) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new UserNotFoundException("Address not found"));
        if (request.isPrimary()) {
            addressRepository.clearPrimary(userId);
        }
        address.setType(request.type());
        address.setLine1(request.line1());
        address.setLine2(request.line2());
        address.setCity(request.city());
        address.setState(request.state());
        address.setPincode(request.pincode());
        address.setCountry(request.country() != null ? request.country() : "India");
        address.setPrimary(request.isPrimary());
        return toResponse(addressRepository.save(address));
    }

    @Override
    @Transactional
    public void deleteAddress(UUID userId, UUID addressId) {
        UserAddress address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new UserNotFoundException("Address not found"));
        addressRepository.delete(address);
    }

    private AddressResponse toResponse(UserAddress a) {
        return new AddressResponse(a.getId(), a.getType(), a.getLine1(), a.getLine2(),
                a.getCity(), a.getState(), a.getPincode(), a.getCountry(), a.isPrimary(), a.getCreatedAt());
    }
}
