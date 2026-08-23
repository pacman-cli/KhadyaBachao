package com.khadyabachao.notification;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceTokenRepository deviceTokenRepository;
    private final com.khadyabachao.user.UserRepository userRepository;

    public record RegisterRequest(@NotBlank String token, @NotBlank String platform) {
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @RequestBody RegisterRequest request) {
        var user = userRepository.getReferenceById(principal.id());
        DeviceToken.Platform platform = DeviceToken.Platform.valueOf(request.platform().toUpperCase());

        deviceTokenRepository.findByToken(request.token()).ifPresentOrElse(existing -> {
            existing.setUser(user);
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
