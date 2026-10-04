import { useState, type ReactNode } from 'react';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
};

export function Tooltip({
  content,
  children,
  side = 'right',
  disabled = false,
}: TooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => {
        setIsVisible(true);
      }}
      onMouseLeave={() => {
        setIsVisible(false);
      }}
      onFocus={() => {
        setIsVisible(true);
      }}
      onBlur={() => {
        setIsVisible(false);
      }}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-md animate-in fade-in-0 zoom-in-95 duration-100 ${positionClasses[side]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
