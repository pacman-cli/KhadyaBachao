package com.khadyabachao;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Full-stack integration test against real PostgreSQL (Testcontainers).
 * Exercises: dev logins -> role enforcement -> create listing -> claim race
 * (first-claim-wins) -> nearby search reflects availability.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class ClaimFlowIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("khadyatest")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate rest;

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    private String login(String email, String name, String role) {
        Map<String, Object> body = role == null
                ? Map.of("email", email, "name", name)
                : Map.of("email", email, "name", name, "role", role);
        var response = rest.postForEntity(baseUrl() + "/api/auth/dev/login", body, Map.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        return (String) response.getBody().get("accessToken");
    }

    private HttpEntity<Object> authed(Object body, String token) {
        HttpHeaders headers = jsonHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(body, headers);
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private Map<String, Object> listingBody(String title) {
        return Map.of(
                "title", title,
                "foodType", "COOKED",
                "quantityValue", 10,
                "quantityUnit", "plates",
                "pickupDeadline", Instant.now().plusSeconds(3 * 3600).toString(),
                "pickupLat", 23.7806,
                "pickupLng", 90.4193,
                "pickupAddress", "Gulshan 1");
    }

    @Test
    void fullClaimFlowWithRaceProtection() {
        String suffix = String.valueOf(System.nanoTime());
        String donor = login("donor-" + suffix + "@test.com", "Donor", "DONOR");
        String r1 = login("r1-" + suffix + "@test.com", "R1", null);
        String r2 = login("r2-" + suffix + "@test.com", "R2", null);

        assertThat(rest.getForObject(baseUrl() + "/api/health", Map.class))
                .containsEntry("status", "UP");

        // unauthenticated creation is rejected
        var anon = rest.exchange(baseUrl() + "/api/listings", HttpMethod.POST,
                new HttpEntity<>(listingBody("anon"), jsonHeaders()), Map.class);
        assertThat(anon.getStatusCode().value()).isEqualTo(401);

        // recipients cannot create listings
        var forbidden = rest.exchange(baseUrl() + "/api/listings", HttpMethod.POST,
                authed(listingBody("nope"), r1), Map.class);
        assertThat(forbidden.getStatusCode().value()).isEqualTo(403);

        // donor creates an available listing near Dhaka
        var created = rest.exchange(baseUrl() + "/api/listings", HttpMethod.POST,
                authed(listingBody("IT test biryani"), donor), Map.class);
        assertThat(created.getStatusCode().value()).isEqualTo(201);
        String listingId = (String) created.getBody().get("id");

        // R1 claims first -> ACCEPTED
        var firstClaim = rest.postForEntity(
                baseUrl() + "/api/listings/" + listingId + "/claim", authed(null, r1), Map.class);
        assertThat(firstClaim.getStatusCode().value()).isEqualTo(201);
        assertThat(firstClaim.getBody()).containsEntry("status", "ACCEPTED");

        // R2 loses the race -> conflict
        var secondClaim = rest.postForEntity(
                baseUrl() + "/api/listings/" + listingId + "/claim", authed(null, r2), Map.class);
        assertThat(secondClaim.getStatusCode().value()).isEqualTo(409);

        // duplicate claim by R1 also conflicts
        var duplicate = rest.postForEntity(
                baseUrl() + "/api/listings/" + listingId + "/claim", authed(null, r1), Map.class);
        assertThat(duplicate.getStatusCode().value()).isEqualTo(409);

        // nearby no longer returns this listing as available
        var nearby = rest.exchange(
                baseUrl() + "/api/listings/nearby?lat=23.78&lng=90.40&radiusKm=5",
                HttpMethod.GET, authed(null, r1),
                new ParameterizedTypeReference<List<Map<String, Object>>>() {
                });
        assertThat(nearby.getStatusCode().value()).isEqualTo(200);
        assertThat(nearby.getBody()).extracting(l -> l.get("id")).doesNotContain(listingId);
    }
}
