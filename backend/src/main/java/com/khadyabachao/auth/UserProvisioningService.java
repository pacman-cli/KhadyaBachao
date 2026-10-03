package com.khadyabachao.auth;

import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns first-login provisioning in its own committed transaction.
 *
 * Why REQUIRES_NEW: User.id uses GenerationType.UUID, so Hibernate defers the
 * INSERT until flush/commit — a UNIQUE(firebase_uid) violation from a
 * concurrent first login surfaces when the transaction completes, NOT inside
 * the repository call. A same-transaction catch would therefore never fire
 * (and the shared tx would already be rollback-only). Committing the insert
 * here puts the constraint violation on THIS method's boundary where the
 * caller can catch it and re-read the winner's row.
 */
@Service
@RequiredArgsConstructor
public class UserProvisioningService {

    private final UserRepository userRepository;

    public record Provisioned(User user, boolean created) {
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Provisioned findOrProvision(String firebaseUid, String name, String email, String phone) {
        return userRepository.findByFirebaseUid(firebaseUid)
            .map(u -> new Provisioned(u, false))
            .orElseGet(() -> new Provisioned(userRepository.save(User.builder()
                .firebaseUid(firebaseUid)
                .name(name)
                .email(email)
                .phone(phone)
                .role(com.khadyabachao.user.UserRole.RECIPIENT_INDIVIDUAL)
                .build()), true));
    }
}
