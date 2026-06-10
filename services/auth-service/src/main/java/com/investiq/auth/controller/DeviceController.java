package com.investiq.auth.controller;

import com.investiq.auth.dto.request.DeviceRegistrationRequest;
import com.investiq.auth.dto.response.ApiResponse;
import com.investiq.auth.dto.response.DeviceResponse;
import com.investiq.auth.service.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/devices")
@RequiredArgsConstructor
@Tag(name = "Device Management")
@SecurityRequirement(name = "bearerAuth")
public class DeviceController {

    private final DeviceService deviceService;

    @GetMapping
    @Operation(summary = "List all trusted devices for the authenticated user")
    public ApiResponse<List<DeviceResponse>> listDevices(
            @AuthenticationPrincipal UserDetails principal) {
        return ApiResponse.ok(deviceService.getDevices(principal.getUsername()));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register and trust a new device for push notifications")
    public ApiResponse<DeviceResponse> registerDevice(
            @Valid @RequestBody DeviceRegistrationRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ApiResponse.ok(deviceService.registerDevice(principal.getUsername(), request));
    }

    @DeleteMapping("/{deviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove and revoke a trusted device")
    public void removeDevice(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal UserDetails principal) {
        deviceService.removeDevice(principal.getUsername(), deviceId);
    }
}
