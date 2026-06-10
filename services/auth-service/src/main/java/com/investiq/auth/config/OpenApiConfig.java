package com.investiq.auth.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI authServiceApi() {
        return new OpenAPI()
            .info(new Info()
                .title("InvestIQ — Auth Service API")
                .description("JWT + OTP authentication, OAuth, MFA, and device management for InvestIQ")
                .version("v1.0.0")
                .contact(new Contact().name("InvestIQ Platform Team").email("platform@investiq.in"))
                .license(new License().name("Proprietary")))
            .servers(List.of(
                new Server().url("http://localhost:8081").description("Local Dev"),
                new Server().url("https://api.investiq.in").description("Production")))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Paste your access token obtained from /api/v1/auth/otp/verify or /login")));
    }
}
