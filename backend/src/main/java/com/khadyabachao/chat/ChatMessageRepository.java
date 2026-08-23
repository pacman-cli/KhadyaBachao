package com.khadyabachao.chat;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("""
        SELECT m FROM ChatMessage m
        WHERE m.request.id = :requestId AND m.sentAt < :before
        ORDER BY m.sentAt DESC
        """)
    Slice<ChatMessage> findHistoryBefore(UUID requestId, Instant before, Pageable pageable);

    @Query("""
        SELECT m FROM ChatMessage m
        WHERE m.request.id = :requestId
        ORDER BY m.sentAt DESC
        """)
    Slice<ChatMessage> findHistoryAll(UUID requestId, Pageable pageable);
}
