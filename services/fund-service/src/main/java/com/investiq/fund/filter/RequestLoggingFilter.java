package com.investiq.fund.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Logs every inbound request and its response status + latency.
 */
@Slf4j
@Component
@Order(2)
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  httpReq = (HttpServletRequest)  req;
        HttpServletResponse httpRes = (HttpServletResponse) res;

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            log.info("{} {} -> {} ({}ms)",
                httpReq.getMethod(), httpReq.getRequestURI(),
                httpRes.getStatus(), elapsed);
        }
    }
}
