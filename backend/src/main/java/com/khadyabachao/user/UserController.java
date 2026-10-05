package com.khadyabachao.user;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /** Roles a user may pick for themselves. ADMIN is never assignable here. */
    private static final Set<UserRole> SELF_SELECTABLE_ROLES =
        Set.of(UserRole.DONOR, UserRole.RECIPIENT_NGO, UserRole.RECIPIENT_INDIVIDUAL, UserRole.VOLUNTEER);

    public record UpdateProfileRequest(
        @Size(max = 100) String name,
        @Size(max = 50) String phone,
        @Size(max = 2048) String profilePhotoUrl) {
    }

    public record UpdateRoleRequest(@NotBlank String role) {
    }

    /**
     * Audit B52: the User entity (firebaseUid, active, internal flags) must not
     * be serialized to clients; see {@link UserResponse}.
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return userRepository.findById(principal.id())
            .map(UserResponse::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(@AuthenticationPrincipal AuthenticatedUser principal,
                                                 @Valid @RequestBody UpdateProfileRequest request) {
        User user = userRepository.findById(principal.id()).orElseThrow();
        if (request.name() != null && !request.name().isBlank()) {
            user.setName(request.name().strip());
        }
        if (request.phone() != null) {
            user.setPhone(request.phone().strip());
        }
        if (request.profilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.profilePhotoUrl().strip());
        }
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }

    /** Role selection on first login. ADMIN can never be self-assigned (audit B15/B17). */
    @PutMapping("/me/role")
    public ResponseEntity<UserResponse> updateRole(@AuthenticationPrincipal AuthenticatedUser principal,
                                                   @jakarta.validation.Valid @RequestBody UpdateRoleRequest request) {
        UserRole role;
        try {
            role = UserRole.valueOf(request.role());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException("Unknown role: " + request.role());
        }
        if (!SELF_SELECTABLE_ROLES.contains(role)) {
            throw new IllegalArgumentException("Role cannot be self-assigned");
        }
        User user = userRepository.findById(principal.id()).orElseThrow();
        if (user.getRole() == UserRole.ADMIN) {
            // Maintainer accounts are managed out-of-band (DB/console); letting
            // them "change role" here would silently destroy their admin access.
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Maintainer accounts cannot switch roles");
        }
        user.setRole(role);
        return ResponseEntity.ok(UserResponse.from(userRepository.save(user)));
    }
}
