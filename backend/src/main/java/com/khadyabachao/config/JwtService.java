package com.khadyabachao.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;
    private final String rawSecret;
    private final Environment environment;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this(secret, expirationMs, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs,
                      Environment environment) {
        this.rawSecret = secret;
        this.environment = environment;
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    private static final String DEFAULT_SECRET =
        "change-me-in-production-khadya-bachao-jwt-secret-key-min-32-chars";

    @PostConstruct
    public void validateProductionSecret() {
        if (environment == null) {
            return;
        }
        boolean isDevLike = false;
        for (String profile : environment.getActiveProfiles()) {
            String p = profile.toLowerCase();
            if (p.equals("dev") || p.equals("local") || p.equals("test") || p.startsWith("test")) {
                isDevLike = true;
                break;
            }
        }
        // Audit B4: refuse the default secret unless the app explicitly runs a
        // dev/local/test profile. No active profile (a common prod misconfiguration)
        // still fails startup — the previous prod-only check missed that case.
        if (!isDevLike && DEFAULT_SECRET.equals(rawSecret)) {
            throw new IllegalStateException(
                "FATAL: Default JWT secret is active. Set JWT_SECRET to a strong random value "
                    + "(dev/local/test profiles may use the default). Active profiles: "
                    + String.join(",", environment.getActiveProfiles()));
        }
    }

    public String issueToken(UUID userId, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userId.toString())
            .claim("role", role)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusMillis(expirationMs)))
            .signWith(key)
            .compact();
    }

    /** Returns the user id if the token is valid, otherwise empty. */
    public UUID validateAndParse(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return UUID.fromString(claims.getSubject());
    }
}
