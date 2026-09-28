package com.khadyabachao.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Audit B4: the default JWT secret must be refused in every profile except
 * explicit dev/local/test runs — including the common misconfiguration of no
 * active profile at all.
 */
class JwtServiceSecretGuardTest {

    private static final String DEFAULT_SECRET =
        "change-me-in-production-khadya-bachao-jwt-secret-key-min-32-chars";

    private JwtService serviceWith(MockEnvironment env) {
        return new JwtService(DEFAULT_SECRET, 60_000, env);
    }

    @Test
    void rejectsDefaultSecretWithNoProfile() {
        MockEnvironment env = new MockEnvironment();
        assertThatThrownBy(() -> serviceWith(env).validateProductionSecret())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Default JWT secret");
    }

    @Test
    void rejectsDefaultSecretInProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        assertThatThrownBy(() -> serviceWith(env).validateProductionSecret())
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void allowsDefaultSecretInDev() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");
        assertThatCode(() -> serviceWith(env).validateProductionSecret())
            .doesNotThrowAnyException();
    }

    @Test
    void allowsDefaultSecretInLocalAndTest() {
        MockEnvironment local = new MockEnvironment();
        local.setActiveProfiles("local");
        MockEnvironment test = new MockEnvironment();
        test.setActiveProfiles("test");

        assertThatCode(() -> serviceWith(local).validateProductionSecret())
            .doesNotThrowAnyException();
        assertThatCode(() -> serviceWith(test).validateProductionSecret())
            .doesNotThrowAnyException();
    }

    @Test
    void allowsCustomSecretInAnyProfile() {
        MockEnvironment env = new MockEnvironment();
        JwtService custom = new JwtService("a-strong-random-production-secret-value-32+chars", 60_000, env);
        assertThatCode(custom::validateProductionSecret).doesNotThrowAnyException();
    }
}
