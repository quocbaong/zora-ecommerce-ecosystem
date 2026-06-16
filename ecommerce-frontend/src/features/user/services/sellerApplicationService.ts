import api from '@/lib/axios';

export interface SellerApplicationRequest {
  shopName: string;
  accountType: 'INDIVIDUAL' | 'BUSINESS';
  warehouseAddress: string;
  warehouseStreet?: string;
  warehouseProvince?: string;
  warehouseDistrict?: string;
  warehouseWard?: string;
  warehouseGhnProvinceId?: number;
  warehouseGhnDistrictId?: number;
  warehouseGhnWardCode?: string;
  taxCode?: string;
  fullName: string;
  idNumber: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankBranch?: string;
  ocrFullName?: string;
  ocrIdNumber?: string;
}

export interface SellerApplicationResponse {
  id: string;
  userId: string;
  shopName: string;
  shopDescription?: string;
  mainCategory?: string;
  warehouseAddress?: string;
  warehouseStreet?: string;
  warehouseProvince?: string;
  warehouseDistrict?: string;
  warehouseWard?: string;
  warehouseGhnProvinceId?: number;
  warehouseGhnDistrictId?: number;
  warehouseGhnWardCode?: string;
  taxCode?: string;
  accountType: string;
  fullName: string;
  idNumber: string;
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankBranch?: string;
  ocrMatch: boolean | null;
  bankNameMatch: boolean | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT_REQUIRED';
  rejectionReason?: string;
  resubmitCount: number;
  ocrFullName?: string;
  ocrIdNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OcrResult {
  idNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  type?: string;
  success: boolean;
  errorMessage?: string;
}

export const sellerApplicationService = {
  submit: (data: SellerApplicationRequest) =>
    api
      .post<SellerApplicationResponse>('/api/users/seller-applications', data, { timeout: 60000 })
      .then((r) => r.data),

  getMyApplication: () =>
    api.get<SellerApplicationResponse>('/api/users/seller-applications/my').then((r) => r.data),

  uploadKycImage: (file: File, type: 'id_front' | 'id_back' | 'selfie') => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return api
      .post<{ url: string }>('/api/users/seller-applications/upload-kyc-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },

  runOcr: (imageUrl: string) =>
    api
      .post<OcrResult>('/api/users/seller-applications/ocr-cccd', { imageUrl }, { timeout: 60000 })
      .then((r) => r.data),
};
