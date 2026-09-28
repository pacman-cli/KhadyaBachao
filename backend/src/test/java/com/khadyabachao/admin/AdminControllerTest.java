package com.khadyabachao.admin;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import com.khadyabachao.verification.OrganizationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private ReportService reportService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrganizationRepository organizationRepository;

    @InjectMocks
    private AdminController adminController;

    private final UUID adminId = UUID.randomUUID();
    private final AuthenticatedUser adminPrincipal =
        new AuthenticatedUser(adminId, "Admin", UserRole.ADMIN);

    @Test
    void deactivate_updatesUserActiveState() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).name("Spammer").active(true).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        Map<String, Object> result = adminController.deactivate(userId, adminPrincipal);

        assertThat(result).containsEntry("active", false);
        assertThat(user.isActive()).isFalse();
        verify(userRepository).save(user);
    }

    @Test
    void deactivate_rejectsSelfDeactivation() {
        User self = User.builder().id(adminId).name("Admin").role(UserRole.ADMIN).active(true).build();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(self));

        assertThatThrownBy(() -> adminController.deactivate(adminId, adminPrincipal))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(409));
        verify(userRepository, never()).save(any());
    }

    @Test
    void deactivate_rejectsAdminTargets() {
        UUID otherAdminId = UUID.randomUUID();
        User otherAdmin = User.builder().id(otherAdminId).name("Admin 2")
            .role(UserRole.ADMIN).active(true).build();
        when(userRepository.findById(otherAdminId)).thenReturn(Optional.of(otherAdmin));

        assertThatThrownBy(() -> adminController.deactivate(otherAdminId, adminPrincipal))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(409));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resolve_delegatesToReportService() {
        UUID reportId = UUID.randomUUID();
        when(reportService.setStatus(reportId, ReportStatus.RESOLVED)).thenReturn(null);

        adminController.resolve(reportId);

        verify(reportService).setStatus(reportId, ReportStatus.RESOLVED);
    }
}
