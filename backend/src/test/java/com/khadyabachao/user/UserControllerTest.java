package com.khadyabachao.user;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.web.server.ResponseStatusException;

/**
 * Audit B15: PUT /api/users/me/role must never accept ADMIN (or unknown
 * roles) — previously any authenticated user could escalate themselves to
 * platform administrator with a single request.
 */
@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserController userController;

    private UUID userId;
    private AuthenticatedUser principal;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        principal = new AuthenticatedUser(userId, "Test User", UserRole.RECIPIENT_INDIVIDUAL);
    }

    @Test
    void updateRole_acceptsSelfSelectableRole() {
        User user = User.builder().id(userId).name("Test").role(UserRole.RECIPIENT_INDIVIDUAL).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = userController.updateRole(
            principal, new UserController.UpdateRoleRequest("VOLUNTEER"));

        assertThat(response.getBody().role()).isEqualTo(UserRole.VOLUNTEER);
    }

    @Test
    void updateRole_rejectsAdmin() {
        assertThatThrownBy(() -> userController.updateRole(
            principal, new UserController.UpdateRoleRequest("ADMIN")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cannot be self-assigned");
    }

    @Test
    void updateRole_rejectsUnknownRole() {
        assertThatThrownBy(() -> userController.updateRole(
            principal, new UserController.UpdateRoleRequest("SUPERUSER")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unknown role");
    }

    @Test
    void updateRole_blocksAdminFromDemotingThemselves() {
        // Maintainers must not be able to silently destroy their own ADMIN
        // access by "changing role" — this actually demoted the live admin
        // account before the guard existed.
        AuthenticatedUser adminPrincipal =
            new AuthenticatedUser(userId, "Admin", UserRole.ADMIN);
        User admin = User.builder().id(userId).name("Admin").role(UserRole.ADMIN).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> userController.updateRole(
            adminPrincipal, new UserController.UpdateRoleRequest("DONOR")))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("Maintainer accounts cannot switch roles");
    }

    @Test
    void me_hidesInternalFields() {
        User user = User.builder()
            .id(userId)
            .name("Test")
            .role(UserRole.DONOR)
            .firebaseUid("secret-firebase-uid")
            .active(true)
            .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        var body = userController.me(principal).getBody();

        assertThat(body).isNotNull();
        // Audit B52: firebaseUid / active must never reach the client.
        assertThat(UserResponse.class.getDeclaredFields())
            .extracting(f -> f.getName())
            .doesNotContain("firebaseUid", "active");
    }
}
