import { cn } from '@/lib/utils';

interface PredictorLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PredictorLogo({ className, size = 'md' }: PredictorLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md',
        sizeClasses[size],
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-2/3 h-2/3"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bar chart */}
        <rect x="3" y="14" width="4" height="6" rx="0.5" fill="white" opacity="0.9" />
        <rect x="10" y="10" width="4" height="10" rx="0.5" fill="white" opacity="0.9" />
        <rect x="17" y="6" width="4" height="14" rx="0.5" fill="white" opacity="0.9" />
        {/* Trend line with dots */}
        <path
          d="M5 12 L12 7 L19 4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="5" cy="12" r="1.5" fill="white" />
        <circle cx="12" cy="7" r="1.5" fill="white" />
        <circle cx="19" cy="4" r="1.5" fill="white" />
      </svg>
    </div>
  );
}
