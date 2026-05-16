package com.investiq.auth.sms;

public interface SmsGateway {
    void sendOtp(String phone, String otp);
}
