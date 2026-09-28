package com.khadyabachao.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(
            "test-secret-key-for-khadya-bachao-min-32-chars!", 60_000);
    }

    @Test
    void issuesAndValidatesToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.issueToken(userId, "DONOR");

        assertThat(jwtService.validateAndParse(token)).isEqualTo(userId);
    }

    @Test
    void rejectsGarbage() {
        assertThatThrownBy(() -> jwtService.validateAndParse("not-a-jwt"))
            .isInstanceOf(Exception.class);
    }

    @Test
    void rejectsTamperedSignature() {
        String token = jwtService.issueToken(UUID.randomUUID(), "DONOR");
        JwtService other = new JwtService(
            "another-secret-key-for-khadya-bachao-32-chars!!", 60_000);

        assertThatThrownBy(() -> other.validateAndParse(token))
            .isInstanceOf(Exception.class);
    }

    @Test
    void rejectsExpiredToken() {
        JwtService shortLived = new JwtService(
            "test-secret-key-for-khadya-bachao-min-32-chars!", -1_000);
        String token = shortLived.issueToken(UUID.randomUUID(), "DONOR");

        assertThatThrownBy(() -> jwtService.validateAndParse(token))
            .isInstanceOf(io.jsonwebtoken.ExpiredJwtException.class);
    }
}
