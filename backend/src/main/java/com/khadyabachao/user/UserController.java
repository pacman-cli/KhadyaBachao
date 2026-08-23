package com.khadyabachao.user;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    public record UpdateProfileRequest(String name, String phone, String profilePhotoUrl) {
    }

    public record UpdateRoleRequest(@NotBlank String role) {
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return userRepository.findById(principal.id())
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    public ResponseEntity<User> updateMe(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @RequestBody UpdateProfileRequest request) {
        User user = userRepository.findById(principal.id()).orElseThrow();
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone());
        }
        if (request.profilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.profilePhotoUrl());
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    /** Role selection on first login. */
    @PutMapping("/me/role")
    public ResponseEntity<User> updateRole(@AuthenticationPrincipal AuthenticatedUser principal,
                                           @RequestBody UpdateRoleRequest request) {
        UserRole role = UserRole.valueOf(request.role());
        User user = userRepository.findById(principal.id()).orElseThrow();
        user.setRole(role);
        return ResponseEntity.ok(userRepository.save(user));
    }
}
