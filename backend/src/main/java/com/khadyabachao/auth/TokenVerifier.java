package com.khadyabachao.auth;

/**
 * Verifies an external identity-provider token (Firebase ID token) and
 * returns the verified identity. Implementations must throw on any invalid token.
 */
public interface TokenVerifier {

    VerifiedIdentity verify(String idToken);

    record VerifiedIdentity(String uid, String email, String name, String phone) {
    }
}
