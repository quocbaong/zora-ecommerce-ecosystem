package com.ecommerce.user_service.service;

import com.ecommerce.user_service.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface UserService {

    UserResponse getProfile(String userId, String email, String role);

    UserResponse getProfileById(String userId);

    UserResponse searchByEmail(String email);

    UserResponse updateProfile(String userId, UserProfileRequest request);

    String uploadAvatar(String userId, MultipartFile file);

    AddressResponse addAddress(String userId, AddressRequest request);

    List<AddressResponse> getAddresses(String userId);

    AddressResponse updateAddress(String userId, String addressId, AddressRequest request);

    void deleteAddress(String userId, String addressId);

    Page<UserResponse> searchSellers(String keyword, int page, int size);

    void sendBankOtp(String userId);

    BankAccountResponse addBankAccount(String userId, BankAccountRequest request);

    List<BankAccountResponse> getBankAccounts(String userId);

    void deleteBankAccount(String userId, String bankAccountId);

    CreditCardResponse addCreditCard(String userId, CreditCardRequest request);

    List<CreditCardResponse> getCreditCards(String userId);

    void deleteCreditCard(String userId, String creditCardId);
    
    void sendCreditCardOtp(String userId);

    WarehouseResponse getMyWarehouse(String sellerId);

    WarehouseResponse updateMyWarehouse(String sellerId, WarehouseRequest request);

    WarehouseResponse getSellerWarehouse(String sellerId);
}
