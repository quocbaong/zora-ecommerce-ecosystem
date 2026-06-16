package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.dto.AddressRequest;
import com.ecommerce.user_service.dto.AddressResponse;
import com.ecommerce.user_service.dto.UserProfileRequest;
import com.ecommerce.user_service.dto.UserResponse;
import com.ecommerce.user_service.dto.WarehouseRequest;
import com.ecommerce.user_service.dto.WarehouseResponse;
import com.ecommerce.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    private String resolveUserId(Principal principal, String headerUserId) {
        if (principal != null && principal.getName() != null) {
            return principal.getName();
        }
        if (headerUserId != null && !headerUserId.isEmpty()) {
            return headerUserId;
        }
        return null;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getProfile(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestHeader(value = "X-User-Email", required = false) String headerEmail,
            @RequestHeader(value = "X-Role", required = false) String headerRole) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getProfile(userId, headerEmail, headerRole));
    }

    @GetMapping("/search")
    public ResponseEntity<UserResponse> searchByEmail(@RequestParam("email") String email) {
        return ResponseEntity.ok(userService.searchByEmail(email));
    }

    @GetMapping("/sellers/search")
    public ResponseEntity<Page<UserResponse>> searchSellers(
            @RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "5") int size) {
        return ResponseEntity.ok(userService.searchSellers(keyword, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getProfileById(@PathVariable("id") String userId) {
        return ResponseEntity.ok(userService.getProfileById(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestBody UserProfileRequest request) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PostMapping("/avatar")
    public ResponseEntity<String> uploadAvatar(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestParam("file") MultipartFile file) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String imageUrl = userService.uploadAvatar(userId, file);
        return ResponseEntity.ok(imageUrl);
    }

    @PostMapping("/address")
    public ResponseEntity<AddressResponse> addAddress(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestBody AddressRequest request) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.addAddress(userId, request));
    }

    @GetMapping("/address")
    public ResponseEntity<List<AddressResponse>> getAddresses(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getAddresses(userId));
    }

    @PutMapping("/address/{id}")
    public ResponseEntity<AddressResponse> updateAddress(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @PathVariable("id") String addressId,
            @RequestBody AddressRequest request) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.updateAddress(userId, addressId, request));
    }

    @DeleteMapping("/address/{id}")
    public ResponseEntity<Void> deleteAddress(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @PathVariable("id") String addressId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        userService.deleteAddress(userId, addressId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bank-accounts/send-otp")
    public ResponseEntity<Void> sendBankOtp(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        userService.sendBankOtp(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bank-accounts")
    public ResponseEntity<com.ecommerce.user_service.dto.BankAccountResponse> addBankAccount(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestBody com.ecommerce.user_service.dto.BankAccountRequest request) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.addBankAccount(userId, request));
    }

    @GetMapping("/bank-accounts")
    public ResponseEntity<List<com.ecommerce.user_service.dto.BankAccountResponse>> getBankAccounts(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getBankAccounts(userId));
    }

    @DeleteMapping("/bank-accounts/{id}")
    public ResponseEntity<Void> deleteBankAccount(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @PathVariable("id") String bankAccountId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        userService.deleteBankAccount(userId, bankAccountId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/credit-cards/send-otp")
    public ResponseEntity<Void> sendCreditCardOtp(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        userService.sendCreditCardOtp(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/credit-cards")
    public ResponseEntity<com.ecommerce.user_service.dto.CreditCardResponse> addCreditCard(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestBody com.ecommerce.user_service.dto.CreditCardRequest request) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.addCreditCard(userId, request));
    }

    @GetMapping("/credit-cards")
    public ResponseEntity<List<com.ecommerce.user_service.dto.CreditCardResponse>> getCreditCards(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getCreditCards(userId));
    }

    @DeleteMapping("/credit-cards/{id}")
    public ResponseEntity<Void> deleteCreditCard(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @PathVariable("id") String creditCardId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        userService.deleteCreditCard(userId, creditCardId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/warehouse")
    public ResponseEntity<WarehouseResponse> getMyWarehouse(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.getMyWarehouse(userId));
    }

    @PutMapping("/me/warehouse")
    public ResponseEntity<WarehouseResponse> updateMyWarehouse(
            Principal principal,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId,
            @RequestBody WarehouseRequest request) {
        String userId = resolveUserId(principal, headerUserId);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(userService.updateMyWarehouse(userId, request));
    }

    @GetMapping("/{sellerId}/warehouse")
    public ResponseEntity<WarehouseResponse> getSellerWarehouse(@PathVariable("sellerId") String sellerId) {
        return ResponseEntity.ok(userService.getSellerWarehouse(sellerId));
    }
}
