package com.investiq.fund.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Adds OWASP-recommended security headers to every response.
 */
@Component
@Order(0)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse httpRes = (HttpServletResponse) res;
        httpRes.setHeader("X-Content-Type-Options",    "nosniff");
        httpRes.setHeader("X-Frame-Options",           "DENY");
        httpRes.setHeader("X-XSS-Protection",          "1; mode=block");
        httpRes.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
        httpRes.setHeader("Cache-Control",             "no-store");
        httpRes.setHeader("Pragma",                    "no-cache");
        httpRes.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        chain.doFilter(req, res);
    }
}
