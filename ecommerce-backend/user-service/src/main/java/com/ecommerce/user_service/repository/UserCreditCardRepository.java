package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.UserCreditCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserCreditCardRepository extends JpaRepository<UserCreditCard, String> {
    List<UserCreditCard> findByUserId(String userId);
}
