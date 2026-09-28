package com.khadyabachao.notification;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceTokenRepository deviceTokenRepository;
    private final com.khadyabachao.user.UserRepository userRepository;

    public record RegisterRequest(
            @NotBlank @Size(max = 4096) String token,
            @NotBlank @Size(max = 16) String platform) {
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<Void> register(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @Valid @RequestBody RegisterRequest request) {
        var user = userRepository.getReferenceById(principal.id());
        DeviceToken.Platform platform;
        try {
            platform = DeviceToken.Platform.valueOf(request.platform().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform: " + request.platform());
        }

        deviceTokenRepository.findByToken(request.token()).ifPresentOrElse(existing -> {
            // Audit B34: a token identifies a device+user pair. Re-registration by a
            // different user must never steal the push target of the original owner.
            if (!existing.getUser().getId().equals(principal.id())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Device token already registered to another user");
            }
            existing.setPlatform(platform);
            deviceTokenRepository.save(existing);
        }, () -> deviceTokenRepository.save(DeviceToken.builder()
            .user(user)
            .token(request.token())
            .platform(platform)
            .build()));

        return ResponseEntity.ok().build();
    }
}
