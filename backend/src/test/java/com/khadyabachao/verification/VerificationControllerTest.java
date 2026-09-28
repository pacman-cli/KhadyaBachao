package com.khadyabachao.verification;

import com.khadyabachao.notification.NotificationService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationControllerTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private VerificationController verificationController;

    @Test
    void submit_createsOrUpdatesOrganizationPendingVerification() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).name("NGO Admin").role(UserRole.RECIPIENT_NGO).build();
        AuthenticatedUser principal = new AuthenticatedUser(userId, "ngo@test.com", UserRole.RECIPIENT_NGO);

        VerificationController.SubmitRequest request = new VerificationController.SubmitRequest(
                "Food Care NGO", "NGO", "https://storage.com/doc.pdf");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(organizationRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(organizationRepository.save(any(Organization.class))).thenAnswer(i -> {
            Organization org = i.getArgument(0);
            org.setId(UUID.randomUUID());
            return org;
        });

        ResponseEntity<VerificationController.VerificationResponse> response = verificationController.submit(principal, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().orgName()).isEqualTo("Food Care NGO");
        assertThat(response.getBody().verificationStatus()).isEqualTo(VerificationStatus.PENDING);
    }
}
