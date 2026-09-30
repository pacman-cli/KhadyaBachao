package com.khadyabachao.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Local-dev fallback used only when Firebase is not configured
 * (app.firebase.enabled != true) under an explicit `dev` profile.
 * Tokens are plain "dev:<uid>:<email>" strings.
 * Fail-closed: without the dev profile this bean does not exist, so a
 * profile-less prod deploy can never accept forged dev tokens.
 */
@Component
@Profile({"dev", "test"})
@ConditionalOnMissingBean(FirebaseTokenVerifier.class)
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "false", matchIfMissing = true)
public class DevTokenVerifier implements TokenVerifier {

    @Override
    public VerifiedIdentity verify(String idToken) {
        if (idToken == null || !idToken.startsWith("dev:")) {
            throw new InvalidTokenException("Invalid dev token");
        }
        String[] parts = idToken.split(":", 3);
        if (parts.length < 2) {
            throw new InvalidTokenException("Malformed dev token");
        }
        return new VerifiedIdentity(parts[1], parts.length > 2 ? parts[2] : null, null, null);
    }
}
