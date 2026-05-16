package com.investiq.auth.service;

import com.investiq.auth.sms.SmsDeliveryException;
import com.investiq.auth.sms.SmsGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class OtpService {

    private static final String KEY_PREFIX = "otp:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;
    private final SmsGateway smsGateway;

    @Value("${app.otp.expiry-seconds:300}")
    private int expirySeconds;

    @Value("${app.otp.length:6}")
    private int otpLength;

    public void generateAndStore(String phone) {
        String otp = generateOtp();
        redisTemplate.opsForValue().set(KEY_PREFIX + phone, otp, Duration.ofSeconds(expirySeconds));
        try {
            smsGateway.sendOtp(phone, otp);
        } catch (SmsDeliveryException e) {
            redisTemplate.delete(KEY_PREFIX + phone);
            throw e;
        }
    }

    public boolean verify(String phone, String otp) {
        String stored = redisTemplate.opsForValue().get(KEY_PREFIX + phone);
        if (stored != null && stored.equals(otp)) {
            redisTemplate.delete(KEY_PREFIX + phone);
            return true;
        }
        return false;
    }

    public int getExpirySeconds() {
        return expirySeconds;
    }

    private String generateOtp() {
        int bound = (int) Math.pow(10, otpLength);
        return String.format("%0" + otpLength + "d", RANDOM.nextInt(bound));
    }
}
