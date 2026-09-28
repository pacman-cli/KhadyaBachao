package com.khadyabachao.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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

    // Limits are configurable so deployments and load tests can tune them
    // without a code change (defaults keep the documented 20 req/min).
    @Value("${app.rate-limit.max-requests:20}")
    private int maxRequests;

    @Value("${app.rate-limit.window-ms:60000}")
    private long windowMs;

    /**
     * Audit B12: X-Forwarded-For is client-controlled. It is only honoured when
     * the request actually arrives from a configured trusted proxy (comma-separated
     * CIDR allowlist, e.g. "10.0.0.0/8,172.16.0.0/12"). Empty by default → the
     * filter always uses request.getRemoteAddr(), which clients cannot spoof.
     */
    @Value("${app.rate-limit.trusted-proxies:}")
    private String trustedProxies;

    private record Window(long start, AtomicInteger count) {
    }

    private final Map<String, Window> buckets = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if (path.startsWith("/api/auth/")) {
            return false;
        }

        if (!"GET".equalsIgnoreCase(method)) {
            if (path.startsWith("/api/listings") ||
                path.startsWith("/api/claims") ||
                path.startsWith("/api/requests") ||
                path.startsWith("/api/verification") ||
                path.startsWith("/api/reports") ||
                path.startsWith("/api/devices")) {
                return false;
            }
        }

        return true;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String category = path.startsWith("/api/auth/") ? "auth" : "write";
        String bucketKey = clientIp(request) + ":" + category;
        long now = System.currentTimeMillis();

        Window window = buckets.compute(bucketKey, (k, w) ->
            w == null || now - w.start() >= windowMs
                ? new Window(now, new AtomicInteger())
                : w);

        if (window.count().incrementAndGet() > maxRequests) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"too_many_requests\"}");
            return;
        }

        // opportunistic cleanup
        if (buckets.size() > 10_000) {
            buckets.entrySet().removeIf(e -> now - e.getValue().start() >= windowMs);
        }

        chain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (trustedProxies == null || trustedProxies.isBlank() || remote == null) {
            return remote;
        }
        for (String cidr : trustedProxies.split(",")) {
            if (isInSubnet(remote, cidr.strip())) {
                String fwd = request.getHeader("X-Forwarded-For");
                if (fwd != null && !fwd.isBlank()) {
                    return fwd.split(",")[0].strip();
                }
            }
        }
        return remote;
    }

    /** Minimal IPv4 CIDR matcher — sufficient for private proxy ranges. */
    private static boolean isInSubnet(String ip, String cidr) {
        if (cidr == null || cidr.isBlank()) {
            return false;
        }
        String[] parts = cidr.split("/");
        byte[] base = parseIPv4(parts[0]);
        if (base == null) {
            return false;
        }
        int prefix = parts.length == 2 ? Integer.parseInt(parts[1]) : 32;
        if (prefix < 0 || prefix > 32) {
            return false;
        }
        byte[] addr = parseIPv4(ip);
        if (addr == null) {
            return false;
        }
        int mask = prefix == 0 ? 0 : (0xFFFFFFFF << (32 - prefix));
        int baseInt = ((base[0] & 0xFF) << 24) | ((base[1] & 0xFF) << 16) | ((base[2] & 0xFF) << 8) | (base[3] & 0xFF);
        int addrInt = ((addr[0] & 0xFF) << 24) | ((addr[1] & 0xFF) << 16) | ((addr[2] & 0xFF) << 8) | (addr[3] & 0xFF);
        return (baseInt & mask) == (addrInt & mask);
    }

    private static byte[] parseIPv4(String ip) {
        if (ip == null) {
            return null;
        }
        String[] parts = ip.split("\\.");
        if (parts.length != 4) {
            return null;
        }
        byte[] out = new byte[4];
        try {
            for (int i = 0; i < 4; i++) {
                int v = Integer.parseInt(parts[i]);
                if (v < 0 || v > 255) {
                    return null;
                }
                out[i] = (byte) v;
            }
        } catch (NumberFormatException e) {
            return null;
        }
        return out;
    }
}
