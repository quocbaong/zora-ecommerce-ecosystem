import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-800">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{description}</p>
      
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground shadow hover:bg-primary/90 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
