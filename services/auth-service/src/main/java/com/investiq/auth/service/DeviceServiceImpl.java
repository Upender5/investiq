package com.investiq.auth.service;

import com.investiq.auth.domain.entity.UserDevice;
import com.investiq.auth.domain.repository.UserDeviceRepository;
import com.investiq.auth.dto.request.DeviceRegistrationRequest;
import com.investiq.auth.dto.response.DeviceResponse;
import com.investiq.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceServiceImpl implements DeviceService {

    private final UserDeviceRepository deviceRepository;

    @Override
    public List<DeviceResponse> getDevices(String userId) {
        UUID uid = UUID.fromString(userId);
        return deviceRepository.findByUserIdOrderByLastSeenAtDesc(uid)
                .stream()
                .map(d -> toResponse(d, false))
                .toList();
    }

    @Override
    @Transactional
    public DeviceResponse registerDevice(String userId, DeviceRegistrationRequest request) {
        UUID uid = UUID.fromString(userId);
        UserDevice device = deviceRepository.findByUserIdAndDeviceToken(uid, request.deviceToken())
                .map(existing -> {
                    existing.setDeviceName(request.deviceName());
                    existing.setPlatform(request.platform());
                    existing.setAppVersion(request.appVersion());
                    existing.setModel(request.model());
                    existing.setLastSeenAt(Instant.now());
                    return existing;
                })
                .orElseGet(() -> UserDevice.builder()
                        .userId(uid)
                        .deviceToken(request.deviceToken())
                        .deviceName(request.deviceName())
                        .platform(request.platform())
                        .appVersion(request.appVersion())
                        .model(request.model())
                        .build());
        return toResponse(deviceRepository.save(device), false);
    }

    @Override
    @Transactional
    public void removeDevice(String userId, UUID deviceId) {
        UUID uid = UUID.fromString(userId);
        UserDevice device = deviceRepository.findByIdAndUserId(deviceId, uid)
                .orElseThrow(() -> new AuthException("Device not found"));
        deviceRepository.delete(device);
    }

    private DeviceResponse toResponse(UserDevice d, boolean current) {
        return new DeviceResponse(
                d.getId(),
                d.getDeviceName(),
                d.getPlatform(),
                d.getPlatform(),
                d.getAppVersion(),
                d.isTrusted(),
                current,
                d.getLastSeenAt(),
                d.getRegisteredAt()
        );
    }
}
