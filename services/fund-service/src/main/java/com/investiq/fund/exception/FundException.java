package com.investiq.fund.exception;

import org.springframework.http.HttpStatus;

public class FundException extends RuntimeException {

    private final String errorCode;
    private final HttpStatus status;

    private FundException(String errorCode, String message, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public String errorCode() { return errorCode; }
    public HttpStatus status() { return status; }

    public static FundException notFound(String schemeCode) {
        return new FundException("FUND_NOT_FOUND",
            "Mutual fund not found: " + schemeCode, HttpStatus.NOT_FOUND);
    }

    public static FundException holdingNotFound(String schemeCode) {
        return new FundException("HOLDING_NOT_FOUND",
            "No holding found for scheme: " + schemeCode, HttpStatus.NOT_FOUND);
    }

    public static FundException sipNotFound(String sipId) {
        return new FundException("SIP_NOT_FOUND",
            "SIP mandate not found: " + sipId, HttpStatus.NOT_FOUND);
    }

    public static FundException insufficientUnits(String schemeCode) {
        return new FundException("INSUFFICIENT_UNITS",
            "Insufficient units in holding for scheme: " + schemeCode, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public static FundException belowMinimum(String field, String minimum) {
        return new FundException("BELOW_MINIMUM_INVESTMENT",
            field + " is below minimum: " + minimum, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    public static FundException invalidRedemption() {
        return new FundException("INVALID_REDEMPTION",
            "Specify either units, amount, or set redeemAll=true", HttpStatus.BAD_REQUEST);
    }

    public static FundException sipAlreadyCancelled(String sipId) {
        return new FundException("SIP_ALREADY_CANCELLED",
            "SIP mandate is already cancelled: " + sipId, HttpStatus.CONFLICT);
    }

    public static FundException fundInactive(String schemeCode) {
        return new FundException("FUND_INACTIVE",
            "Fund is not available for investment: " + schemeCode, HttpStatus.UNPROCESSABLE_ENTITY);
    }
}
