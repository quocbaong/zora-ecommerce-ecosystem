package com.ecommerce.user_service.service.impl;

import com.ecommerce.user_service.dto.OcrResult;
import com.ecommerce.user_service.dto.SellerApplicationRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;
import com.ecommerce.user_service.entity.SellerApplication;
import com.ecommerce.user_service.repository.KycBlacklistRepository;
import com.ecommerce.user_service.repository.SellerApplicationRepository;
import com.ecommerce.user_service.service.OcrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SellerApplicationServiceImplTest {

    @Mock private SellerApplicationRepository applicationRepository;
    @Mock private KycBlacklistRepository blacklistRepository;
    @Mock private OcrService ocrService;

    @InjectMocks private SellerApplicationServiceImpl service;

    private static final String USER_ID = "user-1";
    private static final String OTHER_USER_ID = "user-2";
    private static final String CCCD = "001087034567";
    private static final String FULL_NAME = "NGUYEN VAN A";

    private static final String OLD_FRONT_URL = "https://s3/front-old.jpg";
    private static final String NEW_FRONT_URL = "https://s3/front-new.jpg";

    private SellerApplicationRequest validRequest() {
        SellerApplicationRequest req = new SellerApplicationRequest();
        req.setShopName("Shop A");
        req.setAccountType("INDIVIDUAL");
        req.setFullName(FULL_NAME);
        req.setIdNumber(CCCD);
        req.setIdFrontUrl(NEW_FRONT_URL);
        req.setIdBackUrl("https://s3/back.jpg");
        req.setSelfieUrl("https://s3/selfie.jpg");
        req.setBankName("Techcombank");
        req.setBankAccount("123456");
        req.setBankHolder(FULL_NAME);
        return req;
    }

    private SellerApplication existingRejected() {
        return SellerApplication.builder()
                .id("app-1")
                .userId(USER_ID)
                .status("REJECTED")
                .idNumber(CCCD)
                .fullName(FULL_NAME)
                .idFrontUrl(OLD_FRONT_URL)
                .ocrFullName(FULL_NAME)
                .ocrIdNumber(CCCD)
                .ocrMatch(true)
                .shopName("Old Shop")
                .accountType("INDIVIDUAL")
                .resubmitCount(0)
                .build();
    }

    @BeforeEach
    void stubBlacklist() {
        when(blacklistRepository.existsByTypeAndValue(anyString(), anyString())).thenReturn(false);
    }

    @Test
    void resubmit_voiCccdCuCuaChinhMinh_thanhCong() {
        // Given: U1 đã có đơn REJECTED với CCCD này
        when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.of(existingRejected()));
        // Không có user khác đang giữ CCCD này
        when(applicationRepository.existsByIdNumberAndUserIdNot(CCCD, USER_ID)).thenReturn(false);
        // OCR scan thành công, khớp với CCCD đã nhập
        when(ocrService.extractCccdInfo(anyString())).thenReturn(
                OcrResult.builder().success(true).idNumber(CCCD).fullName(FULL_NAME).build()
        );
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When + Then: không được throw
        SellerApplicationResponse result = service.submit(USER_ID, validRequest(), "127.0.0.1");
        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(result.getIdNumber()).isEqualTo(CCCD);
    }

    @Test
    void submit_voiCccdCuaUserKhac_thiBaoTrung() {
        when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        // Đã có user khác giữ CCCD này
        when(applicationRepository.existsByIdNumberAndUserIdNot(CCCD, USER_ID)).thenReturn(true);

        assertThatThrownBy(() -> service.submit(USER_ID, validRequest(), "127.0.0.1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("ID_NUMBER_ALREADY_USED");
    }

    @Test
    void resubmit_giuNguyenAnhCu_khongQuetLaiOcr_thanhCong() {
        // Given: U1 có đơn REJECTED, idFrontUrl + idNumber đã được OCR và lưu trước đó
        SellerApplication existing = existingRejected();
        when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.of(existing));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When: U1 chỉ đổi tên shop, giữ nguyên ảnh CCCD cũ. Frontend không re-upload nên
        // ocrFullName/ocrIdNumber rỗng, idFrontUrl pre-fill = existing.idFrontUrl
        SellerApplicationRequest req = validRequest();
        req.setShopName("Tên shop mới");
        req.setIdFrontUrl(OLD_FRONT_URL);
        req.setFullName("");
        req.setIdNumber("");

        SellerApplicationResponse result = service.submit(USER_ID, req, "127.0.0.1");

        // Then: OCR KHÔNG được gọi lại, idNumber/fullName giữ nguyên giá trị stored
        verify(ocrService, never()).extractCccdInfo(anyString());
        assertThat(result.getIdNumber()).isEqualTo(CCCD);
        assertThat(result.getFullName()).isEqualTo(FULL_NAME);
        assertThat(result.getShopName()).isEqualTo("Tên shop mới");
        assertThat(result.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void resubmit_voiAnhMoi_thiQuetOcrLai() {
        // Given: U1 có đơn REJECTED với idFrontUrl cũ
        SellerApplication existing = existingRejected();
        when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.of(existing));
        when(applicationRepository.existsByIdNumberAndUserIdNot(anyString(), anyString())).thenReturn(false);
        when(ocrService.extractCccdInfo(anyString())).thenReturn(
                OcrResult.builder().success(true).idNumber(CCCD).fullName(FULL_NAME).build()
        );
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When: User upload ảnh CCCD mới (validRequest mặc định dùng NEW_FRONT_URL)
        service.submit(USER_ID, validRequest(), "127.0.0.1");

        // Then: OCR phải được gọi với ảnh mới
        verify(ocrService).extractCccdInfo(NEW_FRONT_URL);
    }

    @Test
    void submit_voiAnhKhongPhaiCccd_thiBaoAnhKhongHopLe() {
        when(applicationRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(applicationRepository.existsByIdNumberAndUserIdNot(anyString(), anyString())).thenReturn(false);
        // OCR fail vì ảnh không phải CCCD
        when(ocrService.extractCccdInfo(anyString())).thenReturn(
                OcrResult.builder().success(false).errorMessage("No CCCD detected").build()
        );

        assertThatThrownBy(() -> service.submit(USER_ID, validRequest(), "127.0.0.1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("INVALID_CCCD_IMAGE");
    }

}
