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

import java.io.FileInputStream;
import java.io.IOException;

/**
 * Production verifier backed by the Firebase Admin SDK.
 * Active when app.firebase.enabled=true and a service-account file is provided.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
@RequiredArgsConstructor
public class FirebaseTokenVerifier implements TokenVerifier {

    @Value("${app.firebase.credentials-path}")
    private String credentialsPath;

    private FirebaseAuth firebaseAuth;

    @PostConstruct
    void init() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            try (FileInputStream in = new FileInputStream(credentialsPath)) {
                var options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(in))
                    .build();
                FirebaseApp.initializeApp(options);
            }
        }
        firebaseAuth = FirebaseAuth.getInstance();
        log.info("Firebase Admin SDK initialised");
    }

    @Override
    public VerifiedIdentity verify(String idToken) {
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
