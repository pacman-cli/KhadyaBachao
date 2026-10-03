package com.khadyabachao.auth;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionSystemException;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final TokenVerifier tokenVerifier;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final UserProvisioningService userProvisioningService;

    // Deliberately NOT @Transactional: the Firebase ID-token verification is a
    // remote call that must not hold a pooled DB connection, and provisioning
    // commits in its own REQUIRES_NEW transaction (UserProvisioningService).
    public AuthResponse verifyAndLogin(String idToken) {
        TokenVerifier.VerifiedIdentity identity = tokenVerifier.verify(idToken);

        var provisioned = provisionUser(identity);
        User user = provisioned.user();

        String accessToken = jwtService.issueToken(user.getId(), user.getRole().name());
        return new AuthResponse(accessToken, UserResponse.from(user), provisioned.created());
    }

    /**
     * First-login provisioning is check-then-insert on a UNIQUE(firebase_uid)
     * column. A double-tapped sign-in fires two concurrent verify-token calls;
     * the loser's INSERT hits the constraint at the REQUIRES_NEW commit (User
     * id is UUID-generated, so the insert flushes at that transaction's end).
     * Catching it HERE lets the loser continue with the winner's row instead
     * of surfacing a 500 at first sign-in.
     */
    private UserProvisioningService.Provisioned provisionUser(TokenVerifier.VerifiedIdentity identity) {
        try {
            return userProvisioningService.findOrProvision(
                identity.uid(),
                identity.name() != null ? identity.name() : "Unnamed user",
                identity.email(),
                identity.phone());
        } catch (DataIntegrityViolationException | TransactionSystemException e) {
            log.info("Concurrent first-login provisioning for uid {}; continuing with the winner", identity.uid());
            User winner = userRepository.findByFirebaseUid(identity.uid())
                .orElseThrow(() -> e);
            return new UserProvisioningService.Provisioned(winner, false);
        }
    }

    /**
     * {@code newUser} tells the client whether this login provisioned the
     * account (drives the role-selection flow) — mirrors the mobile contract.
     */
    public record AuthResponse(String accessToken, UserResponse user, boolean newUser) {
    }
}
