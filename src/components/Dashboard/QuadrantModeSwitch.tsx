export type QuadrantModeOption<T extends string = string> = { value: T; label: string };

type QuadrantModeSwitchProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly [QuadrantModeOption<T>, QuadrantModeOption<T>];
  ariaLabel: string;
  className?: string;
};

/**
 * Two-option segmented control for quadrant headers (Insights, Cashflow, Asset Allocation).
 * Shows both modes at once so users see there are two views, not a single mystery pill.
 */
export function QuadrantModeSwitch<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
}: QuadrantModeSwitchProps<T>) {
  return (
    <div
      className={`quadrant-mode-switch ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`quadrant-mode-switch__btn ${value === opt.value ? 'is-active' : ''}`}
          aria-pressed={value === opt.value}
          title={opt.label}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onChange(opt.value);
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
