import { useState, useEffect } from 'react';
import {
  Steps,
  Card,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Alert,
  Typography,
  Space,
  Tag,
  Descriptions,
  Spin,
  message,
} from 'antd';
import LocationSelector, { type LocationValue } from '../components/LocationSelector';
import {
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  sellerApplicationService,
  type OcrResult,
} from '../services/sellerApplicationService';
import { authService } from '@/features/auth/services/authService';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;

const BANKS = [
  'Vietcombank', 'Techcombank', 'MB Bank', 'Agribank', 'VietinBank',
  'BIDV', 'TPBank', 'ACB', 'VPBank', 'Sacombank', 'HDBank', 'OCB',
];

const CAN_RESUBMIT = ['REJECTED', 'RESUBMIT_REQUIRED'];

export default function SellerApplicationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  const [idFrontUrl, setIdFrontUrl] = useState('');
  const [idBackUrl, setIdBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [warehouseLocation, setWarehouseLocation] = useState<LocationValue>({
    province: '', district: '', ward: '',
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['my-seller-application'],
    queryFn: sellerApplicationService.getMyApplication,
    retry: false,
  });

  // Khi đơn APPROVED nhưng role trong store vẫn là USER → refresh token lấy role mới
  useEffect(() => {
    if (existing?.status === 'APPROVED' && user?.role === 'USER') {
      const rt = localStorage.getItem('refresh_token');
      if (!rt) return;
      authService.refreshToken(rt)
        .then((tokens) => {
          localStorage.setItem('access_token', tokens.accessToken);
          localStorage.setItem('refresh_token', tokens.refreshToken);
          setUser(tokens.user);
          message.success('Tài khoản đã được nâng cấp lên Seller! Đang chuyển hướng...');
          setTimeout(() => navigate('/seller', { replace: true }), 1500);
        })
        .catch(() => {
          // Nếu refresh thất bại thì để user tự logout/login lại
        });
    }
  }, [existing?.status, user?.role]);

  const submitMutation = useMutation({
    mutationFn: sellerApplicationService.submit,
    onSuccess: () => {
      message.success('Đã nộp lại đăng ký! Vui lòng chờ admin duyệt.');
      setIsEditing(false);
      setCurrentStep(0);
      queryClient.invalidateQueries({ queryKey: ['my-seller-application'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Gửi thất bại, thử lại sau.');
    },
  });

  const runOcr = async (url: string) => {
    setOcrLoading(true);
    try {
      const result = await sellerApplicationService.runOcr(url);
      setOcrResult(result);
      if (result.success) {
        form.setFieldsValue({ ocrFullName: result.fullName, ocrIdNumber: result.idNumber });
        message.success('Quét CCCD thành công!');
      } else {
        message.warning('Quét CCCD thất bại: ' + (result.errorMessage || 'Ảnh không rõ, thử upload lại'));
      }
    } finally {
      setOcrLoading(false);
    }
  };

  const uploadImage = async (file: File, type: 'id_front' | 'id_back' | 'selfie') => {
    try {
      const url = await sellerApplicationService.uploadKycImage(file, type);
      if (type === 'id_front') {
        setIdFrontUrl(url);
        setOcrResult(null);
        runOcr(url); // tự động quét OCR sau khi upload mặt trước
      } else if (type === 'id_back') {
        setIdBackUrl(url);
      } else {
        setSelfieUrl(url);
      }
      return url;
    } catch {
      message.error('Upload ảnh thất bại');
      return '';
    }
  };

  const handleFinish = () => {
    const values = form.getFieldsValue(true);
    const street = values.warehouseStreet || '';
    const warehouseAddress = [street, warehouseLocation.ward, warehouseLocation.district, warehouseLocation.province]
      .filter(Boolean).join(', ');
    submitMutation.mutate({
      shopName: values.shopName,
      accountType: values.accountType,
      warehouseAddress,
      warehouseStreet: street,
      warehouseProvince: warehouseLocation.province,
      warehouseDistrict: warehouseLocation.district,
      warehouseWard: warehouseLocation.ward,
      warehouseGhnProvinceId: warehouseLocation.ghnProvinceId,
      warehouseGhnDistrictId: warehouseLocation.ghnDistrictId,
      warehouseGhnWardCode: warehouseLocation.ghnWardCode,
      taxCode: values.taxCode,
      fullName: values.ocrFullName || '',
      idNumber: values.ocrIdNumber || '',
      idFrontUrl,
      idBackUrl,
      selfieUrl,
      bankName: values.bankName,
      bankAccount: values.bankAccount,
      bankHolder: values.bankHolder,
      bankBranch: values.bankBranch,
      ocrFullName: values.ocrFullName,
      ocrIdNumber: values.ocrIdNumber,
    });
  };

  const handleStartEdit = (app: typeof existing) => {
    if (!app) return;
    form.setFieldsValue({
      shopName: app.shopName,
      accountType: app.accountType,
      warehouseStreet: app.warehouseStreet || '',
      taxCode: app.taxCode || '',
      bankName: app.bankName,
      bankAccount: app.bankAccount,
      bankHolder: app.bankHolder,
      bankBranch: app.bankBranch,
    });
    setWarehouseLocation({
      province: app.warehouseProvince || '',
      district: app.warehouseDistrict || '',
      ward: app.warehouseWard || '',
      ghnProvinceId: app.warehouseGhnProvinceId,
      ghnDistrictId: app.warehouseGhnDistrictId,
      ghnWardCode: app.warehouseGhnWardCode,
    });
    setIdFrontUrl(app.idFrontUrl ?? '');
    setIdBackUrl(app.idBackUrl ?? '');
    setSelfieUrl(app.selfieUrl ?? '');
    setOcrResult(null);
    setCurrentStep(0);
    setIsEditing(true);
  };

  if (isLoading) return <Spin />;

  // Có đơn và không đang edit → hiện trang status
  if (existing && !isEditing) {
    return (
      <ApplicationStatus
        app={existing}
        onEdit={CAN_RESUBMIT.includes(existing.status) ? () => handleStartEdit(existing) : undefined}
      />
    );
  }

  const steps = [
    { title: 'Thông tin shop' },
    { title: 'Xác minh CCCD' },
    { title: 'Tài khoản ngân hàng' },
    { title: 'Xác nhận & Gửi' },
  ];

  const isResubmit = !!existing;

  return (
    <Card style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={3}>{isResubmit ? 'Chỉnh sửa và nộp lại đơn' : 'Đăng ký trở thành Seller'}</Title>

      {isResubmit && existing?.rejectionReason && (
        <Alert
          type="error"
          showIcon
          message="Lý do bị từ chối"
          description={existing.rejectionReason}
          style={{ marginBottom: 20 }}
        />
      )}

      <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

      <Form form={form} layout="vertical">
        {currentStep === 0 && (
          <StepShopInfo
            location={warehouseLocation}
            onLocationChange={setWarehouseLocation}
          />
        )}
        {currentStep === 1 && (
          <StepCCCD
            idFrontUrl={idFrontUrl}
            idBackUrl={idBackUrl}
            selfieUrl={selfieUrl}
            ocrResult={ocrResult}
            ocrLoading={ocrLoading}
            onUpload={uploadImage}
          />
        )}
        {currentStep === 2 && <StepBankInfo />}
        {currentStep === 3 && (
          <StepReview form={form} idFrontUrl={idFrontUrl} idBackUrl={idBackUrl} selfieUrl={selfieUrl} ocrResult={ocrResult} warehouseLocation={warehouseLocation} />
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>Quay lại</Button>
            )}
            {currentStep === 0 && isResubmit && (
              <Button onClick={() => setIsEditing(false)}>Huỷ chỉnh sửa</Button>
            )}
          </div>
          <div>
            {currentStep < steps.length - 1 && (
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    await form.validateFields(getStepFields(currentStep));
                    if (currentStep === 0) {
                      if (!warehouseLocation.province || !warehouseLocation.district || !warehouseLocation.ward) {
                        message.error('Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện, phường/xã');
                        return;
                      }
                    }
                    if (currentStep === 1 && (!idFrontUrl || !idBackUrl || !selfieUrl)) {
                      message.error('Vui lòng upload đủ 3 ảnh CCCD');
                      return;
                    }
                    setCurrentStep(currentStep + 1);
                  } catch {}
                }}
              >
                Tiếp theo
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button type="primary" loading={submitMutation.isPending} onClick={handleFinish}>
                {isResubmit ? 'Nộp lại' : 'Gửi đăng ký'}
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Card>
  );
}

function getStepFields(step: number): string[] {
  if (step === 0) return ['shopName', 'accountType', 'warehouseStreet'];
  if (step === 2) return ['bankName', 'bankAccount', 'bankHolder'];
  return [];
}

interface StepShopInfoProps {
  location: LocationValue;
  onLocationChange: (v: LocationValue) => void;
}

function StepShopInfo({ location, onLocationChange }: StepShopInfoProps) {
  return (
    <>
      <Form.Item name="shopName" label="Tên shop" rules={[{ required: true, message: 'Nhập tên shop' }]}>
        <Input placeholder="Tên cửa hàng của bạn" />
      </Form.Item>
      <Form.Item name="accountType" label="Loại tài khoản" rules={[{ required: true }]}>
        <Select options={[{ value: 'INDIVIDUAL', label: 'Cá nhân' }, { value: 'BUSINESS', label: 'Doanh nghiệp' }]} />
      </Form.Item>

      <Form.Item label="Địa chỉ lấy hàng" required extra="Địa chỉ chính xác để đơn vị vận chuyển đến lấy hàng">
        <div className="flex flex-col gap-3">
          <LocationSelector
            province={location.province}
            district={location.district}
            ward={location.ward}
            ghnProvinceId={location.ghnProvinceId}
            ghnDistrictId={location.ghnDistrictId}
            ghnWardCode={location.ghnWardCode}
            onChange={onLocationChange}
            required
          />
          <Form.Item
            name="warehouseStreet"
            noStyle
            rules={[{ required: true, message: 'Nhập số nhà, tên đường' }]}
          >
            <Input placeholder="Số nhà, tên đường" size="large" />
          </Form.Item>
        </div>
      </Form.Item>

      <Form.Item
        name="taxCode"
        label="Mã số thuế cá nhân (nếu có)"
        extra="Để hoàn thiện hồ sơ thuế của bạn"
      >
        <Input placeholder="Nhập mã số thuế cá nhân" maxLength={20} />
      </Form.Item>
    </>
  );
}

interface StepCCCDProps {
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  ocrResult: OcrResult | null;
  ocrLoading: boolean;
  onUpload: (file: File, type: 'id_front' | 'id_back' | 'selfie') => Promise<string>;
}

function StepCCCD({ idFrontUrl, idBackUrl, selfieUrl, ocrResult, ocrLoading, onUpload }: StepCCCDProps) {
  const makeUploadProps = (type: 'id_front' | 'id_back' | 'selfie') => ({
    beforeUpload: (file: File) => { onUpload(file, type); return false; },
    maxCount: 1,
    accept: 'image/*',
    showUploadList: false as const,
  });

  return (
    <>
      <Alert
        type="info"
        showIcon
        message="Upload ảnh mặt trước CCCD — hệ thống sẽ tự động quét OCR"
        style={{ marginBottom: 16 }}
      />

      <Form.Item label="Mặt trước CCCD" required>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload {...makeUploadProps('id_front')}>
            <Button icon={<UploadOutlined />} loading={ocrLoading}>
              {ocrLoading ? 'Đang quét OCR...' : 'Chọn ảnh mặt trước'}
            </Button>
          </Upload>
          {idFrontUrl && !ocrLoading && (
            <img src={idFrontUrl} alt="front" style={{ maxHeight: 120, borderRadius: 4 }} />
          )}
          {ocrLoading && (
            <Alert type="info" showIcon message="Đang xử lý OCR, vui lòng chờ..." />
          )}
          {!ocrLoading && ocrResult && (
            ocrResult.success
              ? <Alert type="success" showIcon message={`Quét thành công: ${ocrResult.fullName} — ${ocrResult.idNumber}`} />
              : <Alert type="warning" showIcon message={`Quét thất bại: ${ocrResult.errorMessage || 'Ảnh không rõ'} — thử upload lại`} />
          )}
        </Space>
      </Form.Item>

      <Form.Item label="Mặt sau CCCD" required>
        <Upload {...makeUploadProps('id_back')}>
          <Button icon={<UploadOutlined />}>Chọn ảnh mặt sau</Button>
        </Upload>
        {idBackUrl && <img src={idBackUrl} alt="back" style={{ maxHeight: 120, borderRadius: 4, marginTop: 8 }} />}
      </Form.Item>

      <Form.Item label="Ảnh selfie cầm CCCD" required>
        <Upload {...makeUploadProps('selfie')}>
          <Button icon={<UploadOutlined />}>Chọn ảnh selfie</Button>
        </Upload>
        {selfieUrl && <img src={selfieUrl} alt="selfie" style={{ maxHeight: 120, borderRadius: 4, marginTop: 8 }} />}
      </Form.Item>

      <Form.Item name="ocrFullName" hidden><Input /></Form.Item>
      <Form.Item name="ocrIdNumber" hidden><Input /></Form.Item>
    </>
  );
}

function StepBankInfo() {
  return (
    <>
      <Form.Item name="bankName" label="Ngân hàng" rules={[{ required: true }]}>
        <Select showSearch options={BANKS.map((b) => ({ value: b, label: b }))} placeholder="Chọn ngân hàng" />
      </Form.Item>
      <Form.Item name="bankAccount" label="Số tài khoản" rules={[{ required: true }]}>
        <Input placeholder="1234567890" />
      </Form.Item>
      <Form.Item
        name="bankHolder"
        label="Tên chủ tài khoản (viết HOA, không dấu)"
        rules={[{ required: true, message: 'Nhập tên chủ tài khoản' }]}
        normalize={(v: string) => v ? v.toUpperCase() : v}
      >
        <Input placeholder="NGUYEN VAN A" />
      </Form.Item>
      <Form.Item name="bankBranch" label="Chi nhánh (tuỳ chọn)">
        <Input placeholder="Chi nhánh HCM" />
      </Form.Item>
    </>
  );
}

interface StepReviewProps {
  form: ReturnType<typeof Form.useForm>[0];
  idFrontUrl: string;
  idBackUrl: string;
  selfieUrl: string;
  ocrResult: OcrResult | null;
  warehouseLocation: LocationValue;
}

function StepReview({ form, idFrontUrl, idBackUrl, selfieUrl, ocrResult, warehouseLocation }: StepReviewProps) {
  const v = form.getFieldsValue(true);
  const warehouseAddress = [v.warehouseStreet, warehouseLocation.ward, warehouseLocation.district, warehouseLocation.province]
    .filter(Boolean).join(', ');
  return (
    <>
      <Alert type="warning" showIcon message="Kiểm tra kỹ thông tin trước khi gửi." style={{ marginBottom: 16 }} />
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Tên shop">{v.shopName}</Descriptions.Item>
        <Descriptions.Item label="Loại TK">{v.accountType}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ lấy hàng">{warehouseAddress}</Descriptions.Item>
        {v.taxCode && <Descriptions.Item label="Mã số thuế">{v.taxCode}</Descriptions.Item>}
        <Descriptions.Item label="Ảnh CCCD">
          <Space>
            {idFrontUrl && <img src={idFrontUrl} alt="front" style={{ height: 60 }} />}
            {idBackUrl && <img src={idBackUrl} alt="back" style={{ height: 60 }} />}
            {selfieUrl && <img src={selfieUrl} alt="selfie" style={{ height: 60 }} />}
          </Space>
        </Descriptions.Item>
        {ocrResult?.success && (
          <Descriptions.Item label="OCR">
            <Tag color="green">{ocrResult.fullName} — {ocrResult.idNumber}</Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Ngân hàng">{v.bankName}</Descriptions.Item>
        <Descriptions.Item label="Số TK">{v.bankAccount}</Descriptions.Item>
        <Descriptions.Item label="Chủ TK">{v.bankHolder}</Descriptions.Item>
      </Descriptions>
    </>
  );
}

type AppType = ReturnType<typeof sellerApplicationService.getMyApplication> extends Promise<infer T> ? T : never;

function ApplicationStatus({ app, onEdit }: { app: AppType; onEdit?: () => void }) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    PENDING:            { color: 'gold',   icon: <ClockCircleOutlined />,  label: 'Đang chờ duyệt' },
    APPROVED:           { color: 'green',  icon: <CheckCircleOutlined />,  label: 'Đã được duyệt' },
    REJECTED:           { color: 'red',    icon: <CloseCircleOutlined />,  label: 'Bị từ chối' },
    RESUBMIT_REQUIRED:  { color: 'orange', icon: <ClockCircleOutlined />,  label: 'Cần bổ sung thông tin' },
  };
  const cfg = statusConfig[app.status] ?? statusConfig.PENDING;

  return (
    <Card style={{ maxWidth: 600, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={4}>Trạng thái đăng ký Seller</Title>
        <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 14, padding: '4px 12px' }}>
          {cfg.label}
        </Tag>

        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Shop">{app.shopName}</Descriptions.Item>
          <Descriptions.Item label="Gửi lúc">
            {app.createdAt ? new Date(app.createdAt).toLocaleString('vi-VN') : '—'}
          </Descriptions.Item>
          {app.updatedAt && app.status !== 'PENDING' && (
            <Descriptions.Item label="Xét duyệt lúc">
              {new Date(app.updatedAt).toLocaleString('vi-VN')}
            </Descriptions.Item>
          )}
          {app.rejectionReason && (
            <Descriptions.Item label="Lý do từ chối">
              <Text type="danger">{app.rejectionReason}</Text>
            </Descriptions.Item>
          )}
          {app.resubmitCount > 0 && (
            <Descriptions.Item label="Lần nộp">{app.resubmitCount + 1}</Descriptions.Item>
          )}
        </Descriptions>

        {app.status === 'APPROVED' && (
          <Alert type="success" showIcon message="Chúc mừng! Tài khoản của bạn đã được nâng cấp lên Seller." />
        )}

        {(app.status === 'REJECTED' || app.status === 'RESUBMIT_REQUIRED') && onEdit && (
          <Alert
            type="warning"
            showIcon
            message="Bạn có thể chỉnh sửa thông tin và nộp lại đơn"
            description={
              app.resubmitCount >= 2
                ? `Bạn còn ${3 - app.resubmitCount} lần nộp lại. Hãy kiểm tra kỹ trước khi gửi.`
                : 'Vui lòng đọc lý do từ chối, cập nhật đúng thông tin rồi nộp lại.'
            }
            action={
              <Button type="primary" danger={app.resubmitCount >= 2} onClick={onEdit}>
                Chỉnh sửa & Nộp lại
              </Button>
            }
          />
        )}
      </Space>
    </Card>
  );
}
