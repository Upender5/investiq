package com.investiq.user.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, String role) {

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }

    public boolean owns(UUID resourceUserId) {
        return userId.equals(resourceUserId);
    }
}
