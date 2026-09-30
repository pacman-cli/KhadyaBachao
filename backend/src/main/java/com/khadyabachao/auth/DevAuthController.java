package com.khadyabachao.auth;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

/**
 * Dev-only login: issues a backend JWT without Firebase so the full auth
 * pipeline can be exercised locally.
 *
 * Guarding is fail-closed: the backdoor exists ONLY under an explicit
 * `dev` profile (previous `!prod` gating left profile-less prod deploys
 * with a live account-takeover endpoint whenever FIREBASE_ENABLED was
 * unset — startup-audit finding). Run local dev with
 * SPRING_PROFILES_ACTIVE=dev.
 */
@Slf4j
@RestController
@RequestMapping("/api/auth/dev")
@Profile({"dev", "test"})
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class DevAuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @PostConstruct
    void init() {
        log.warn("SECURITY WARNING: DevAuthController is ACTIVE under the dev profile. POST /api/auth/dev/login is enabled for testing.");
    }

    public record DevLoginRequest(
        @NotBlank @Email String email,
        @NotBlank String name,
        String role) {
    }

    public record TokenResponse(String accessToken) {
    }

    @PostMapping("/login")
    public ResponseEntity<DevLoginResponse> devLogin(@RequestBody DevLoginRequest request) {
        UserRole requested = request.role() != null ? safeValueOf(request.role()) : null;
        if (requested == UserRole.ADMIN) {
            // Audit B17: dev login must never mint or overwrite an ADMIN.
            throw new IllegalArgumentException("ADMIN role cannot be granted via dev login");
        }
        boolean isNewUser = userRepository.findByEmail(request.email()).isEmpty();
        User user = userRepository.findByEmail(request.email())
            .orElseGet(() -> userRepository.save(User.builder()
                .firebaseUid("dev-" + request.email())
                .name(request.name())
                .email(request.email())
                .role(requested != null ? requested : UserRole.RECIPIENT_INDIVIDUAL)
                .build()));

        if (requested != null && user.getRole() != requested) {
            user.setRole(requested);
            userRepository.save(user);
        }

        String token = jwtService.issueToken(user.getId(), user.getRole().name());
        return ResponseEntity.ok(new DevLoginResponse(token, isNewUser));
    }

    /** {@code newUser} lets the client decide whether to show role selection. */
    public record DevLoginResponse(String accessToken, boolean newUser) {
    }

    private static UserRole safeValueOf(String role) {
        try {
            return UserRole.valueOf(role);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown role: " + role);
        }
    }
}
