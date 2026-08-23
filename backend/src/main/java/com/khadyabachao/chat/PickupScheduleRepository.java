package com.khadyabachao.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PickupScheduleRepository extends JpaRepository<PickupSchedule, UUID> {

    Optional<PickupSchedule> findByRequestId(UUID requestId);
}
