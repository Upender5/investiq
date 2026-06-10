package com.investiq.marketdata.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI marketDataApi() {
        return new OpenAPI()
            .info(new Info()
                .title("InvestIQ — Market Data Service API")
                .description("Real-time quotes, OHLCV, stock fundamentals, technicals, news, corporate actions and watchlists")
                .version("v1.0.0"))
            .servers(List.of(
                new Server().url("http://localhost:8085").description("Local Dev"),
                new Server().url("https://api.investiq.in").description("Production")))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
