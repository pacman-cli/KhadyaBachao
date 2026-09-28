package com.khadyabachao.request;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RatingRepository extends JpaRepository<Rating, UUID> {

    boolean existsByRequestId(UUID requestId);

    boolean existsByRequestIdAndRaterId(UUID requestId, UUID raterId);

    Optional<Rating> findByRequestIdAndRaterId(UUID requestId, UUID raterId);

    List<Rating> findByRequestId(UUID requestId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Rating r WHERE r.ratedUser.id = :userId")
    double averageRatingFor(UUID userId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM Rating r WHERE r.ratedUser.id = :userId AND r.targetRole = :targetRole")
    double averageRatingForRole(UUID userId, String targetRole);
}
