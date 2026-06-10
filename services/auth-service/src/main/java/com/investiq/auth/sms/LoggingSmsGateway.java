package com.investiq.auth.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "logging", matchIfMissing = true)
public class LoggingSmsGateway implements SmsGateway {

    @Override
    public void sendOtp(String phone, String otp) {
        log.warn("[DEV] OTP for {}: {} — replace app.sms.provider=logging with msg91 in prod", phone, otp);
        System.out.println("========================================");
        System.out.println("  [DEV OTP]  Phone: " + phone);
        System.out.println("  [DEV OTP]  Code : " + otp);
        System.out.println("========================================");
    }
}
