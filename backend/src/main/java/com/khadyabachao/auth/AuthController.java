package com.khadyabachao.auth;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.user.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public record VerifyTokenRequest(@NotBlank String idToken) {
    }

    public record RefreshResponse(String accessToken) {
    }

    @PostMapping("/verify-token")
    public ResponseEntity<AuthService.AuthResponse> verifyToken(@RequestBody VerifyTokenRequest request) {
        return ResponseEntity.ok(authService.verifyAndLogin(request.idToken()));
    }

    /** Exchanges a still-valid backend JWT for a fresh one (sliding session). */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader("Authorization") String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "missing token"));
        }
        try {
            var userId = jwtService.validateAndParse(authorization.substring(7));
            var user = userRepository.findById(userId)
                .filter(com.khadyabachao.user.User::isActive)
                .orElse(null);
            if (user == null) {
                return ResponseEntity.status(401).body(java.util.Map.of("error", "unauthorized"));
            }
            return ResponseEntity.ok(new RefreshResponse(jwtService.issueToken(user.getId(), user.getRole().name())));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "invalid token"));
        }
    }
}
