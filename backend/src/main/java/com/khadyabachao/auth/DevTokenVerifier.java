package com.khadyabachao.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Local-dev fallback used only when Firebase is not configured
 * (app.firebase.enabled != true). Tokens are plain "dev:<uid>:<email>" strings.
 * NEVER active in production — FirebaseTokenVerifier replaces this bean.
 */
@Component
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
