package com.khadyabachao.auth;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TokenVerifier tokenVerifier;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse verifyAndLogin(String idToken) {
        TokenVerifier.VerifiedIdentity identity = tokenVerifier.verify(idToken);

        User user = userRepository.findByFirebaseUid(identity.uid())
            .orElseGet(() -> userRepository.save(User.builder()
                .firebaseUid(identity.uid())
                .name(identity.name() != null ? identity.name() : "Unnamed user")
                .email(identity.email())
                .phone(identity.phone())
                .role(UserRole.RECIPIENT_INDIVIDUAL)
                .build()));

        String accessToken = jwtService.issueToken(user.getId(), user.getRole().name());
        return new AuthResponse(accessToken, user);
    }

    public record AuthResponse(String accessToken, User user) {
    }
}
