package com.investiq.user.web;

import com.investiq.user.dto.response.ApiResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Guarantees every InvestIQ controller response is wrapped in the {@link ApiResponse}
 * {@code { message, data }} envelope, even when handlers return raw DTOs, {@code Page<T>},
 * {@code Map}, lists or primitives. Bodies already wrapped (ApiResponse / ProblemDetail)
 * pass through untouched, so this is safe to apply alongside hand-wrapped controllers.
 */
@RestControllerAdvice
public class ResponseEnvelopeAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return MappingJackson2HttpMessageConverter.class.isAssignableFrom(converterType)
            && returnType.getContainingClass().getName().startsWith("com.investiq");
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body instanceof ApiResponse<?> || body instanceof ProblemDetail) {
            return body;
        }
        return ApiResponse.ok(body);
    }
}
