import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import { useProvinces, useDistricts, useWards } from '../hooks/useVietnamLocation';

export interface LocationValue {
  province: string;
  district: string;
  ward: string;
  ghnProvinceId?: number;
  ghnDistrictId?: number;
  ghnWardCode?: string;
}

interface LocationSelectorProps {
  province: string;
  district: string;
  ward: string;
  ghnProvinceId?: number;
  ghnDistrictId?: number;
  ghnWardCode?: string;
  onChange: (value: LocationValue) => void;
  required?: boolean;
}

export default function LocationSelector({
  province,
  district,
  ward,
  ghnProvinceId,
  ghnDistrictId,
  ghnWardCode,
  onChange,
  required,
}: LocationSelectorProps) {
  const { data: provinces, isLoading: loadingProvinces } = useProvinces();

  // Local state cho GHN ID — luôn ưu tiên ID từ prop, fallback resolve theo tên
  const [provinceId, setProvinceId] = useState<number | undefined>(ghnProvinceId);
  const [districtId, setDistrictId] = useState<number | undefined>(ghnDistrictId);
  const [wardCode, setWardCode] = useState<string | undefined>(ghnWardCode);

  // Sync prop ID → state khi parent thay đổi (vd: edit address)
  useEffect(() => { setProvinceId(ghnProvinceId); }, [ghnProvinceId]);
  useEffect(() => { setDistrictId(ghnDistrictId); }, [ghnDistrictId]);
  useEffect(() => { setWardCode(ghnWardCode); }, [ghnWardCode]);

  // Resolve tên → ID nếu address cũ chưa có ID (edit address legacy)
  useEffect(() => {
    if (!provinces || !province || provinceId != null) return;
    const found = provinces.find((p) => p.provinceName === province);
    if (found) setProvinceId(found.provinceId);
  }, [provinces, province, provinceId]);

  const { data: districts, isLoading: loadingDistricts } = useDistricts(provinceId);

  useEffect(() => {
    if (!districts || !district || districtId != null) return;
    const found = districts.find((d) => d.districtName === district);
    if (found) setDistrictId(found.districtId);
  }, [districts, district, districtId]);

  const { data: wards, isLoading: loadingWards } = useWards(districtId);

  useEffect(() => {
    if (!wards || !ward || wardCode != null) return;
    const found = wards.find((w) => w.wardName === ward);
    if (found) setWardCode(found.wardCode);
  }, [wards, ward, wardCode]);

  const provinceOptions = useMemo(
    () => (provinces ?? []).map((p) => ({ value: p.provinceName, label: p.provinceName, id: p.provinceId })),
    [provinces]
  );
  const districtOptions = useMemo(
    () => (districts ?? []).map((d) => ({ value: d.districtName, label: d.districtName, id: d.districtId })),
    [districts]
  );
  const wardOptions = useMemo(
    () => (wards ?? []).map((w) => ({ value: w.wardName, label: w.wardName, id: w.wardCode })),
    [wards]
  );

  const handleProvinceChange = (value: string, option: any) => {
    const newId = option?.id;
    setProvinceId(newId);
    setDistrictId(undefined);
    setWardCode(undefined);
    onChange({
      province: value || '',
      district: '',
      ward: '',
      ghnProvinceId: newId,
      ghnDistrictId: undefined,
      ghnWardCode: undefined,
    });
  };

  const handleDistrictChange = (value: string, option: any) => {
    const newId = option?.id;
    setDistrictId(newId);
    setWardCode(undefined);
    onChange({
      province,
      district: value || '',
      ward: '',
      ghnProvinceId: provinceId,
      ghnDistrictId: newId,
      ghnWardCode: undefined,
    });
  };

  const handleWardChange = (value: string, option: any) => {
    const newCode = option?.id;
    setWardCode(newCode);
    onChange({
      province,
      district,
      ward: value || '',
      ghnProvinceId: provinceId,
      ghnDistrictId: districtId,
      ghnWardCode: newCode,
    });
  };

  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Tỉnh / Thành phố {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          showSearch
          allowClear
          placeholder="Chọn tỉnh / thành phố"
          value={province || undefined}
          onChange={handleProvinceChange}
          loading={loadingProvinces}
          options={provinceOptions}
          filterOption={(input, option) =>
            (option?.label as string).toLowerCase().includes(input.toLowerCase())
          }
          className="w-full"
          size="large"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Quận / Huyện {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          showSearch
          allowClear
          placeholder={provinceId ? 'Chọn quận / huyện' : 'Chọn tỉnh / thành phố trước'}
          value={district || undefined}
          onChange={handleDistrictChange}
          loading={loadingDistricts}
          options={districtOptions}
          disabled={!provinceId}
          filterOption={(input, option) =>
            (option?.label as string).toLowerCase().includes(input.toLowerCase())
          }
          className="w-full"
          size="large"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Phường / Xã {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          showSearch
          allowClear
          placeholder={districtId ? 'Chọn phường / xã' : 'Chọn quận / huyện trước'}
          value={ward || undefined}
          onChange={handleWardChange}
          loading={loadingWards}
          options={wardOptions}
          disabled={!districtId}
          filterOption={(input, option) =>
            (option?.label as string).toLowerCase().includes(input.toLowerCase())
          }
          className="w-full"
          size="large"
        />
      </div>
    </>
  );
}
