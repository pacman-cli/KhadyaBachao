package com.khadyabachao.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface NotificationRecordRepository extends JpaRepository<NotificationRecord, UUID> {

    Page<NotificationRecord> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE NotificationRecord n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllReadForUser(UUID userId);
}
