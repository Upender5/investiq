package com.investiq.auth.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "msg91")
public class Msg91SmsGateway implements SmsGateway {

    private static final String BASE_URL = "https://api.msg91.com/api/v5/otp";
    private static final String COUNTRY_CODE = "91";

    private final RestClient restClient;
    private final String authKey;
    private final String templateId;

    public Msg91SmsGateway(
        @Value("${app.sms.msg91.auth-key}") String authKey,
        @Value("${app.sms.msg91.template-id}") String templateId
    ) {
        this.authKey = authKey;
        this.templateId = templateId;
        this.restClient = RestClient.builder()
            .baseUrl(BASE_URL)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    @Override
    public void sendOtp(String phone, String otp) {
        try {
            Map<?, ?> response = restClient.get()
                .uri(u -> u
                    .queryParam("authkey", authKey)
                    .queryParam("template_id", templateId)
                    .queryParam("mobile", COUNTRY_CODE + phone)
                    .queryParam("otp", otp)
                    .build())
                .retrieve()
                .body(Map.class);
            log.debug("MSG91 response for {}: {}", phone, response);
        } catch (Exception e) {
            // Let OtpService surface a clean error to the caller
            throw new SmsDeliveryException("Failed to send OTP via MSG91", e);
        }
    }
}
