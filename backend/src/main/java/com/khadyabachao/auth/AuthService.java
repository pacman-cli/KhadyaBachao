package com.khadyabachao.auth;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserResponse;
import com.khadyabachao.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final TokenVerifier tokenVerifier;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse verifyAndLogin(String idToken) {
        TokenVerifier.VerifiedIdentity identity = tokenVerifier.verify(idToken);

        var provisioned = provisionUser(identity);
        User user = provisioned.user();

        String accessToken = jwtService.issueToken(user.getId(), user.getRole().name());
        return new AuthResponse(accessToken, UserResponse.from(user), provisioned.created());
    }

    private record Provisioned(User user, boolean created) {
    }

    /**
     * First-login provisioning is check-then-insert on a UNIQUE(firebase_uid)
     * column — a double-tapped sign-in fires two concurrent verify-token calls
     * and the loser hits the constraint. Previously that surfaced as a 500 at
     * the exact moment the user expected to be signed in; now the loser
     * re-selects and continues with the winner's row.
     */
    private Provisioned provisionUser(TokenVerifier.VerifiedIdentity identity) {
        try {
            return findOrProvision(identity, true);
        } catch (DataIntegrityViolationException e) {
            log.info("Concurrent first-login provisioning for uid {}; continuing with the winner", identity.uid());
            return userRepository.findByFirebaseUid(identity.uid())
                .map(u -> new Provisioned(u, false))
                .orElseThrow(() -> e);
        }
    }

    private Provisioned findOrProvision(TokenVerifier.VerifiedIdentity identity, boolean created) {
        return userRepository.findByFirebaseUid(identity.uid())
            .map(u -> new Provisioned(u, false))
            .orElseGet(() -> new Provisioned(userRepository.save(User.builder()
                .firebaseUid(identity.uid())
                .name(identity.name() != null ? identity.name() : "Unnamed user")
                .email(identity.email())
                .phone(identity.phone())
                .role(UserRole.RECIPIENT_INDIVIDUAL)
                .build()), true));
    }

    /**
     * {@code newUser} tells the client whether this login provisioned the
     * account (drives the role-selection flow) — mirrors the mobile contract.
     */
    public record AuthResponse(String accessToken, UserResponse user, boolean newUser) {
    }
}
