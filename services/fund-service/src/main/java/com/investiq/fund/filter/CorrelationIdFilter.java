package com.investiq.fund.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

/**
 * Propagates X-Correlation-ID header across the request lifecycle.
 * Injects into MDC so every log line carries the correlation ID.
 */
@Component
@Order(1)
public class CorrelationIdFilter implements Filter {

    private static final String HEADER = "X-Correlation-ID";
    private static final String MDC_KEY = "correlationId";

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  httpReq  = (HttpServletRequest)  req;
        HttpServletResponse httpRes  = (HttpServletResponse) res;

        String correlationId = httpReq.getHeader(HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        MDC.put(MDC_KEY, correlationId);
        httpRes.setHeader(HEADER, correlationId);

        try {
            chain.doFilter(req, res);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
