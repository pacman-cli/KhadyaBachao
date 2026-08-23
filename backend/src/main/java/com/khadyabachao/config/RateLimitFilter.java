package com.khadyabachao.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple fixed-window per-IP rate limiter for public auth endpoints.
 * Good enough for MVP abuse protection; swap for Bucket4j/Redis at scale.
 */
@Component
@Order(1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_WINDOW = 20;
    private static final long WINDOW_MS = 60_000;

    private record Window(long start, AtomicInteger count) {
    }

    private final Map<String, Window> buckets = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip = clientIp(request);
        long now = System.currentTimeMillis();

        Window window = buckets.compute(ip, (k, w) ->
            w == null || now - w.start() >= WINDOW_MS
                ? new Window(now, new AtomicInteger())
                : w);

        if (window.count().incrementAndGet() > MAX_REQUESTS_PER_WINDOW) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"too_many_requests\"}");
            return;
        }

        // opportunistic cleanup
        if (buckets.size() > 10_000) {
            buckets.entrySet().removeIf(e -> now - e.getValue().start() >= WINDOW_MS);
        }

        chain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String fwd = request.getHeader("X-Forwarded-For");
        return fwd != null ? fwd.split(",")[0].strip() : request.getRemoteAddr();
    }
}
