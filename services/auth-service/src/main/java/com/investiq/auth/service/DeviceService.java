package com.investiq.auth.service;

import com.investiq.auth.dto.request.DeviceRegistrationRequest;
import com.investiq.auth.dto.response.DeviceResponse;

import java.util.List;
import java.util.UUID;

/**
 * Manages trusted devices for push notifications and device-aware security policies.
 */
public interface DeviceService {
    List<DeviceResponse> getDevices(String userId);
    DeviceResponse registerDevice(String userId, DeviceRegistrationRequest request);
    void removeDevice(String userId, UUID deviceId);
}
