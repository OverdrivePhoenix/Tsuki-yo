package com.prefetch.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${prefetch.firebase.credentials-path:classpath:serviceAccountKey.json}")
    private String credentialsPath;

    @Value("${prefetch.firebase.project-id:prefetch-campus}")
    private String projectId;

    private final ResourceLoader resourceLoader;

    public FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        try {
            GoogleCredentials credentials;
            String envCredentials = System.getenv("FIREBASE_CREDENTIALS_JSON");

            if (envCredentials != null && !envCredentials.isBlank()) {
                log.info("Initializing Firebase via FIREBASE_CREDENTIALS_JSON environment variable");
                try (InputStream stream = new ByteArrayInputStream(envCredentials.getBytes(StandardCharsets.UTF_8))) {
                    credentials = GoogleCredentials.fromStream(stream);
                }
            } else {
                log.info("Attempting to load Firebase credentials from path: {}", credentialsPath);
                Resource resource = resourceLoader.getResource(credentialsPath);
                if (resource.exists()) {
                    try (InputStream is = resource.getInputStream()) {
                        credentials = GoogleCredentials.fromStream(is);
                    }
                } else {
                    log.warn("Credentials file not found at {}. Falling back to Application Default Credentials.", credentialsPath);
                    credentials = GoogleCredentials.getApplicationDefault();
                }
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .setProjectId(projectId)
                    .build();

            FirebaseApp app = FirebaseApp.initializeApp(options);
            log.info("FirebaseApp initialized successfully for project: {}", projectId);
            return app;
        } catch (Exception e) {
            log.error("Failed to initialize FirebaseApp with credentials: {}. Initializing with Project ID fallback.", e.getMessage());
            // Fallback initialization to allow development/mock testing without immediate credentials
            FirebaseOptions options = FirebaseOptions.builder()
                    .setProjectId(projectId)
                    .build();
            return FirebaseApp.initializeApp(options);
        }
    }

    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        return FirestoreClient.getFirestore(firebaseApp);
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
