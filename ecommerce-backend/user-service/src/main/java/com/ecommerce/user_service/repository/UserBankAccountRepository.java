package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.UserBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserBankAccountRepository extends JpaRepository<UserBankAccount, String> {
    List<UserBankAccount> findByUserId(String userId);
}
