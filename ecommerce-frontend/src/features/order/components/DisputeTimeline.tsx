import { CheckCircle2, Clock, Package, Truck } from 'lucide-react';

interface DisputeTimelineProps {
  status: string;
  type?: string;
}

export default function DisputeTimeline({ status, type }: DisputeTimelineProps) {
  const steps = type === 'REFUND_ONLY' 
    ? [
        { key: 'REQUESTED', label: 'Yêu cầu hoàn tiền', icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> },
        { key: 'REFUNDED', label: 'Đã hoàn tiền', icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> },
      ]
    : [
        { key: 'REQUESTED', label: 'Yêu cầu trả hàng', icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> },
        { key: 'WAITING_FOR_RETURN', label: 'Chờ gửi hàng', icon: <Package className="w-4 h-4 sm:w-5 sm:h-5" /> },
        { key: 'RETURN_SHIPPING', label: 'Đang hoàn hàng', icon: <Truck className="w-4 h-4 sm:w-5 sm:h-5" /> },
        { key: 'REFUNDED', label: 'Đã hoàn tiền', icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> },
      ];

  let currentIndex = 0;
  if (type === 'REFUND_ONLY') {
    if (status === 'REFUNDED') currentIndex = 1;
    else currentIndex = 0;
  } else {
    if (status === 'WAITING_FOR_RETURN') currentIndex = 1;
    else if (status === 'RETURN_SHIPPING' || status === 'RETURN_RECEIVED' || status === 'DISPUTED_BY_SELLER' || status === 'UNDER_REVIEW') currentIndex = 2;
    else if (status === 'REFUNDED') currentIndex = 3;
  }

  return (
    <div className="relative flex justify-between w-full mt-4 mb-2 px-2 sm:px-6">
      <div className="absolute top-4 left-6 right-6 h-0.5 bg-orange-100 z-0" />
      <div
        className="absolute top-4 left-6 h-0.5 bg-orange-500 z-0 transition-all duration-500"
        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
      />
      {steps.map((step, idx) => {
        const done = idx <= currentIndex;
        const active = idx === currentIndex;
        return (
          <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2 flex-1">
            <div
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition-all bg-white ${
                done
                  ? 'border-orange-500 text-orange-500'
                  : 'border-orange-200 text-orange-200'
              } ${active ? 'ring-4 ring-orange-50 scale-110 shadow-sm' : ''}`}
            >
              {step.icon}
            </div>
            <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${done ? 'text-orange-700' : 'text-orange-300'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
