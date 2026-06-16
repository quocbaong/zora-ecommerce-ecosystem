package com.ecommerce.user_service.service.impl;

import com.ecommerce.user_service.dto.*;
import com.ecommerce.user_service.entity.Address;
import com.ecommerce.user_service.entity.SellerProfile;
import com.ecommerce.user_service.entity.User;
import com.ecommerce.user_service.entity.UserBankAccount;
import com.ecommerce.user_service.entity.UserCreditCard;
import com.ecommerce.user_service.exception.ResourceNotFoundException;
import com.ecommerce.user_service.repository.AddressRepository;
import com.ecommerce.user_service.repository.UserBankAccountRepository;
import com.ecommerce.user_service.repository.UserCreditCardRepository;
import com.ecommerce.user_service.repository.SellerProfileRepository;
import com.ecommerce.user_service.repository.UserRepository;
import com.ecommerce.user_service.service.S3Service;
import com.ecommerce.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final UserBankAccountRepository bankAccountRepository;
    private final UserCreditCardRepository creditCardRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final S3Service s3Service;
    private final com.ecommerce.user_service.service.SellerEmailService emailService;

    private final java.util.Map<String, String> bankOtpMap = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Map<String, Long> bankOtpExpiryMap = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    @Transactional
    public UserResponse getProfile(String userId, String email, String role) {
        User user = getUserOrCreate(userId);
        boolean dirty = false;
        if (email != null && !email.isBlank() && (user.getEmail() == null || user.getEmail().isBlank())) {
            user.setEmail(email);
            dirty = true;
        }
        if (role != null && !role.isBlank() && !role.equals(user.getRole())) {
            user.setRole(role);
            dirty = true;
        }
        if (dirty) user = userRepository.save(user);
        return mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getProfileById(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        return mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse searchByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return mapToUserResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(String userId, UserProfileRequest request) {
        User user = getUserOrCreate(userId);
        user.setName(request.getFullName());
        user.setPhone(request.getPhone());
        User updatedUser = userRepository.save(user);
        return mapToUserResponse(updatedUser);
    }

    @Override
    @Transactional
    public String uploadAvatar(String userId, MultipartFile file) {
        User user = getUserOrCreate(userId);

        if (user.getAvatarUrl() != null && !user.getAvatarUrl().isBlank()) {
            s3Service.deleteFile(user.getAvatarUrl());
        }

        String avatarUrl = s3Service.uploadFile(file);
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
        log.info("Avatar updated for userId: {}, url: {}", userId, avatarUrl);
        return avatarUrl;
    }

    @Override
    @Transactional
    public AddressResponse addAddress(String userId, AddressRequest request) {
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            unsetOtherDefaultAddresses(userId);
        }

        Address address = Address.builder()
                .userId(userId)
                .receiverName(request.getReceiverName())
                .phone(request.getPhone())
                .province(request.getProvince())
                .district(request.getDistrict())
                .ward(request.getWard())
                .street(request.getStreet())
                .isDefault(request.getIsDefault() != null ? request.getIsDefault() : false)
                .ghnProvinceId(request.getGhnProvinceId())
                .ghnDistrictId(request.getGhnDistrictId())
                .ghnWardCode(request.getGhnWardCode())
                .build();

        Address savedAddress = addressRepository.save(address);
        return mapToAddressResponse(savedAddress);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponse> getAddresses(String userId) {
        return addressRepository.findByUserId(userId).stream()
                .map(this::mapToAddressResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(String userId, String addressId, AddressRequest request) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found or does not belong to user"));

        if (Boolean.TRUE.equals(request.getIsDefault()) && !Boolean.TRUE.equals(address.getIsDefault())) {
            unsetOtherDefaultAddresses(userId);
        }

        address.setReceiverName(request.getReceiverName());
        address.setPhone(request.getPhone());
        address.setProvince(request.getProvince());
        address.setDistrict(request.getDistrict());
        address.setWard(request.getWard());
        address.setStreet(request.getStreet());
        if (request.getIsDefault() != null) {
            address.setIsDefault(request.getIsDefault());
        }
        if (request.getGhnProvinceId() != null) address.setGhnProvinceId(request.getGhnProvinceId());
        if (request.getGhnDistrictId() != null) address.setGhnDistrictId(request.getGhnDistrictId());
        if (request.getGhnWardCode() != null) address.setGhnWardCode(request.getGhnWardCode());

        Address updatedAddress = addressRepository.save(address);
        return mapToAddressResponse(updatedAddress);
    }

    @Override
    @Transactional
    public void deleteAddress(String userId, String addressId) {
        Address address = addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found or does not belong to user"));
        addressRepository.delete(address);
    }

    private void unsetOtherDefaultAddresses(String userId) {
        addressRepository.unsetDefaultAddresses(userId);
    }

    private User getUserOrCreate(String userId) {
        return userRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User newUser = User.builder().userId(userId).build();
                    return userRepository.save(newUser);
                });
    }

    @Override
    public Page<UserResponse> searchSellers(String keyword, int page, int size) {
        String pattern = (keyword == null || keyword.isBlank()) ? null : "%" + keyword.toLowerCase() + "%";
        return userRepository.findByFilters("SELLER", null, pattern, PageRequest.of(page, size))
                .map(this::mapToUserResponse);
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getUserId())
                .fullName(user.getName())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseResponse getMyWarehouse(String sellerId) {
        return sellerProfileRepository.findById(sellerId)
                .map(this::mapWarehouse)
                .orElseGet(() -> WarehouseResponse.builder()
                        .sellerId(sellerId)
                        .configured(false)
                        .build());
    }

    @Override
    @Transactional
    public WarehouseResponse updateMyWarehouse(String sellerId, WarehouseRequest req) {
        SellerProfile profile = sellerProfileRepository.findById(sellerId)
                .orElseThrow(() -> new ResourceNotFoundException("Seller profile not found"));
        profile.setWarehouseProvince(req.getWarehouseProvince());
        profile.setWarehouseDistrict(req.getWarehouseDistrict());
        profile.setWarehouseWard(req.getWarehouseWard());
        profile.setWarehouseStreet(req.getWarehouseStreet());
        profile.setWarehousePhone(req.getWarehousePhone());
        profile.setWarehouseGhnProvinceId(req.getWarehouseGhnProvinceId());
        profile.setWarehouseGhnDistrictId(req.getWarehouseGhnDistrictId());
        profile.setWarehouseGhnWardCode(req.getWarehouseGhnWardCode());
        return mapWarehouse(sellerProfileRepository.save(profile));
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseResponse getSellerWarehouse(String sellerId) {
        return sellerProfileRepository.findById(sellerId)
                .map(this::mapWarehouse)
                .orElseThrow(() -> new ResourceNotFoundException("Seller warehouse not found"));
    }

    private WarehouseResponse mapWarehouse(SellerProfile p) {
        boolean configured = p.getWarehouseGhnDistrictId() != null && p.getWarehouseGhnWardCode() != null;
        return WarehouseResponse.builder()
                .sellerId(p.getSellerId())
                .warehouseProvince(p.getWarehouseProvince())
                .warehouseDistrict(p.getWarehouseDistrict())
                .warehouseWard(p.getWarehouseWard())
                .warehouseStreet(p.getWarehouseStreet())
                .warehousePhone(p.getWarehousePhone())
                .warehouseGhnProvinceId(p.getWarehouseGhnProvinceId())
                .warehouseGhnDistrictId(p.getWarehouseGhnDistrictId())
                .warehouseGhnWardCode(p.getWarehouseGhnWardCode())
                .configured(configured)
                .build();
    }

    private AddressResponse mapToAddressResponse(Address address) {
        return AddressResponse.builder()
                .id(address.getId())
                .receiverName(address.getReceiverName())
                .phone(address.getPhone())
                .province(address.getProvince())
                .district(address.getDistrict())
                .ward(address.getWard())
                .street(address.getStreet())
                .isDefault(address.getIsDefault())
                .ghnProvinceId(address.getGhnProvinceId())
                .ghnDistrictId(address.getGhnDistrictId())
                .ghnWardCode(address.getGhnWardCode())
                .build();
    }

    @Override
    public void sendBankOtp(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new RuntimeException("User email not configured");
        }
        String otp = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        bankOtpMap.put(userId, otp);
        bankOtpExpiryMap.put(userId, System.currentTimeMillis() + 5 * 60 * 1000); // 5 mins
        emailService.sendBankOtpEmail(user.getEmail(), otp);
    }

    @Override
    @Transactional
    public BankAccountResponse addBankAccount(String userId, BankAccountRequest request) {
        String expectedOtp = bankOtpMap.get(userId);
        Long expiry = bankOtpExpiryMap.get(userId);
        
        if (expectedOtp == null || expiry == null || System.currentTimeMillis() > expiry) {
            throw new RuntimeException("OTP_EXPIRED");
        }
        if (!expectedOtp.equals(request.getOtp())) {
            throw new RuntimeException("INVALID_OTP");
        }
        
        bankOtpMap.remove(userId);
        bankOtpExpiryMap.remove(userId);

        UserBankAccount account = UserBankAccount.builder()
                .userId(userId)
                .bankName(request.getBankName())
                .accountNumber(request.getAccountNumber())
                .accountHolderName(request.getAccountHolderName())
                .branchName(request.getBranchName())
                .isDefault(request.isDefault())
                .build();
        UserBankAccount saved = bankAccountRepository.save(account);
        return mapToBankAccountResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BankAccountResponse> getBankAccounts(String userId) {
        return bankAccountRepository.findByUserId(userId).stream()
                .map(this::mapToBankAccountResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteBankAccount(String userId, String bankAccountId) {
        UserBankAccount account = bankAccountRepository.findById(bankAccountId)
                .filter(a -> a.getUserId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found or does not belong to user"));
        bankAccountRepository.delete(account);
    }

    @Override
    public void sendCreditCardOtp(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new RuntimeException("User email not configured");
        }
        String otp = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        bankOtpMap.put(userId + "_cc", otp);
        bankOtpExpiryMap.put(userId + "_cc", System.currentTimeMillis() + 5 * 60 * 1000); // 5 mins
        emailService.sendCreditCardOtpEmail(user.getEmail(), otp);
    }

    @Override
    @Transactional
    public CreditCardResponse addCreditCard(String userId, CreditCardRequest request) {
        String expectedOtp = bankOtpMap.get(userId + "_cc");
        Long expiry = bankOtpExpiryMap.get(userId + "_cc");
        
        if (expectedOtp == null || expiry == null || System.currentTimeMillis() > expiry) {
            throw new RuntimeException("OTP_EXPIRED");
        }
        if (!expectedOtp.equals(request.getOtp())) {
            throw new RuntimeException("INVALID_OTP");
        }
        
        bankOtpMap.remove(userId + "_cc");
        bankOtpExpiryMap.remove(userId + "_cc");

        UserCreditCard card = UserCreditCard.builder()
                .userId(userId)
                .cardBrand(request.getCardBrand())
                .last4Digits(request.getLast4Digits())
                .expiryDate(request.getExpiryDate())
                .cardHolderName(request.getCardHolderName())
                .isDefault(request.isDefault())
                .build();
        UserCreditCard saved = creditCardRepository.save(card);
        return mapToCreditCardResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CreditCardResponse> getCreditCards(String userId) {
        return creditCardRepository.findByUserId(userId).stream()
                .map(this::mapToCreditCardResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteCreditCard(String userId, String creditCardId) {
        UserCreditCard card = creditCardRepository.findById(creditCardId)
                .filter(c -> c.getUserId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Credit card not found or does not belong to user"));
        creditCardRepository.delete(card);
    }

    private BankAccountResponse mapToBankAccountResponse(UserBankAccount account) {
        return BankAccountResponse.builder()
                .id(account.getId())
                .bankName(account.getBankName())
                .accountNumber(account.getAccountNumber())
                .accountHolderName(account.getAccountHolderName())
                .branchName(account.getBranchName())
                .isDefault(account.isDefault())
                .createdAt(account.getCreatedAt())
                .updatedAt(account.getUpdatedAt())
                .build();
    }

    private CreditCardResponse mapToCreditCardResponse(UserCreditCard card) {
        return CreditCardResponse.builder()
                .id(card.getId())
                .cardBrand(card.getCardBrand())
                .last4Digits(card.getLast4Digits())
                .expiryDate(card.getExpiryDate())
                .cardHolderName(card.getCardHolderName())
                .isDefault(card.isDefault())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
