package com.khadyabachao.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserId(UUID userId);

    @Query("SELECT t.token FROM DeviceToken t WHERE t.user.id IN :userIds")
    List<String> findTokensByUserIds(List<UUID> userIds);
}
