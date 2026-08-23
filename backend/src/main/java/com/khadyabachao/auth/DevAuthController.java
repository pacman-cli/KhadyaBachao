package com.khadyabachao.auth;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dev-only login: issues a backend JWT without Firebase so the full auth
 * pipeline can be exercised locally. Removed automatically when
 * app.firebase.enabled=true.
 */
@RestController
@RequestMapping("/api/auth/dev")
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class DevAuthController {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public record DevLoginRequest(
        @NotBlank @Email String email,
        @NotBlank String name,
        String role) {
    }

    public record TokenResponse(String accessToken) {
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> devLogin(@RequestBody DevLoginRequest request) {
        UserRole role = request.role() != null ? UserRole.valueOf(request.role()) : UserRole.RECIPIENT_INDIVIDUAL;
        User user = userRepository.findByEmail(request.email())
            .orElseGet(() -> userRepository.save(User.builder()
                .firebaseUid("dev-" + request.email())
                .name(request.name())
                .email(request.email())
                .role(role)
                .build()));

        if (request.role() != null && user.getRole() != role) {
            user.setRole(role);
            userRepository.save(user);
        }

        return ResponseEntity.ok(new TokenResponse(jwtService.issueToken(user.getId(), user.getRole().name())));
    }
}
