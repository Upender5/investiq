package com.investiq.notification.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, String role) {}
