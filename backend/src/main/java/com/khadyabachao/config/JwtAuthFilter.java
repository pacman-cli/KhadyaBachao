package com.khadyabachao.config;

import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UUID userId = jwtService.validateAndParse(header.substring(7));
                userRepository.findById(userId)
                    .filter(User::isActive)
                    .ifPresent(user -> {
                        AuthenticatedUser principal = new AuthenticatedUser(user);
                        var auth = new UsernamePasswordAuthenticationToken(
                            principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
            } catch (Exception ignored) {
                // invalid/expired token -> request stays unauthenticated
            }
        }
        filterChain.doFilter(request, response);
    }

    public record AuthenticatedUser(UUID id, String name, UserRole role) {
        public AuthenticatedUser(User user) {
            this(user.getId(), user.getName(), user.getRole());
        }

        public User toUser() {
            return User.builder().id(id).name(name).role(role).build();
        }
    }
}
