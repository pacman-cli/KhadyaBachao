package com.khadyabachao.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

/**
 * Audit B8: the dev auth backdoor (DevAuthController / DevTokenVerifier) is
 * active whenever app.firebase.enabled != true. A production deployment that
 * merely forgets FIREBASE_ENABLED must fail at startup instead of silently
 * accepting forged dev tokens and role overrides.
 */
@Component
@RequiredArgsConstructor
public class ProdStartupGuard {

    private final Environment environment;

    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    @PostConstruct
    void check() {
        boolean isProd = false;
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equalsIgnoreCase("prod") || profile.equalsIgnoreCase("production")) {
                isProd = true;
                break;
            }
        }
        if (isProd && !firebaseEnabled) {
            throw new IllegalStateException(
                "FATAL: running the prod profile with app.firebase.enabled=false leaves the dev "
                    + "auth backdoor enabled (forged tokens + role override). Set FIREBASE_ENABLED=true "
                    + "and configure FIREBASE_CREDENTIALS_PATH.");
        }
    }
}
