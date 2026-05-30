package com.investiq.trade.exception;

import org.springframework.http.HttpStatus;

public class TradeException extends RuntimeException {

    private final HttpStatus status;

    public TradeException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
