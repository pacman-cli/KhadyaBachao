package com.khadyabachao.verification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByUserId(UUID userId);

    Page<Organization> findByVerificationStatus(VerificationStatus status, Pageable pageable);

    long countByVerificationStatus(VerificationStatus status);
}
