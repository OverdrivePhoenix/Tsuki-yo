package com.prefetch.model;

import com.google.cloud.firestore.annotation.DocumentId;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @DocumentId
    private String userId;
    private String name;
    private String email;
    private String department;
    private String rollNumber;
    private UserRole role;       // STUDENT | ADMIN
}
