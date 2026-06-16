package com.ecommerce.auth_service.repository;

import com.ecommerce.auth_service.entity.User;
import com.ecommerce.auth_service.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, String> {
    Optional<UserProfile> findByUser(User user);
}
