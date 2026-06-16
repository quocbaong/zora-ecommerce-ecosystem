import { forwardRef, type InputHTMLAttributes } from 'react';

type BaseInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
>;

interface NumberInputProps extends BaseInputProps {
  // Giá trị số nguyên hiện tại. 0 được hiển thị như rỗng để không bị "kẹt số 0".
  value: number | null | undefined;
  // Trả về undefined khi người dùng xóa hết (nếu nullable = true), ngược lại trả về 0.
  onChange: (value: number | undefined) => void;
  nullable?: boolean;
  min?: number;
  max?: number;
}

// Định dạng số nguyên kiểu Việt Nam: 100000 -> "100.000"
function formatVN(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

/**
 * Input nhập số nguyên với 2 cải tiến:
 *  - Không bị kẹt số 0 ở đầu khi state khởi tạo là 0 (0 hiển thị rỗng).
 *  - Tự thêm dấu chấm ngăn cách hàng nghìn khi gõ (100000 -> "100.000").
 *
 * Dùng type="text" + inputMode="numeric" để có thể chèn dấu chấm hiển thị,
 * đồng thời vẫn bung bàn phím số trên mobile.
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, nullable = false, min, max, ...rest }, ref) => {
    const display =
      value == null || value === 0 ? '' : formatVN(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Chỉ giữ lại chữ số, mọi ký tự khác (dấu chấm, dấu phẩy, chữ) đều bỏ
      const digits = e.target.value.replace(/\D/g, '');
      if (digits === '') {
        onChange(nullable ? undefined : 0);
        return;
      }
      let num = Number(digits);
      if (typeof max === 'number' && num > max) num = max;
      if (typeof min === 'number' && num < min) num = min;
      onChange(num);
    };

    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
      />
    );
  },
);

NumberInput.displayName = 'NumberInput';

export default NumberInput;
