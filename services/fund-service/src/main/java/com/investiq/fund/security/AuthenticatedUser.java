package com.investiq.fund.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, String role) {
    public boolean isAdmin() {
        return "ADMIN".equals(role) || "SUPER_ADMIN".equals(role);
    }
}
