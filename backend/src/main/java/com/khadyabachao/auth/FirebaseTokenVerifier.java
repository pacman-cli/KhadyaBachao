package com.khadyabachao.auth;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;

/**
 * Production verifier backed by the Firebase Admin SDK.
 * Active when app.firebase.enabled=true and service account credentials are provided.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
@RequiredArgsConstructor
public class FirebaseTokenVerifier implements TokenVerifier {

    @Value("${app.firebase.credentials-path:}")
    private String credentialsPath;

    @Value("${app.firebase.credentials-json:}")
    private String credentialsJson;

    private FirebaseAuth firebaseAuth;

    @PostConstruct
    void init() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                GoogleCredentials credentials;
                if (credentialsJson != null && !credentialsJson.isBlank()) {
                    credentials = GoogleCredentials.fromStream(
                        new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8)));
                } else if (credentialsPath != null && !credentialsPath.isBlank()) {
                    try (FileInputStream in = new FileInputStream(credentialsPath)) {
                        credentials = GoogleCredentials.fromStream(in);
                    }
                } else {
                    credentials = GoogleCredentials.getApplicationDefault();
                }

                var options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();
                FirebaseApp.initializeApp(options);
            }
            firebaseAuth = FirebaseAuth.getInstance();
            log.info("Firebase Admin SDK initialised successfully");
        } catch (Exception e) {
            // Audit B9: when Firebase auth is explicitly enabled, invalid credentials
            // must fail startup loudly instead of surfacing as confusing login errors.
            throw new IllegalStateException(
                "FATAL: app.firebase.enabled=true but Firebase Admin SDK initialisation failed: "
                    + e.getMessage(), e);
        }
    }

    @Override
    public VerifiedIdentity verify(String idToken) {
        if (firebaseAuth == null) {
            throw new InvalidTokenException("Firebase Admin SDK is uninitialised on backend");
        }
        try {
            FirebaseToken token = firebaseAuth.verifyIdToken(idToken);
            Object phoneClaim = token.getClaims().get("phone_number");
            return new VerifiedIdentity(
                token.getUid(),
                token.getEmail(),
                token.getName(),
                phoneClaim != null ? phoneClaim.toString() : null);
        } catch (FirebaseAuthException e) {
            throw new InvalidTokenException("Invalid Firebase ID token");
        }
    }
}
