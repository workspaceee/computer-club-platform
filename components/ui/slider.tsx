'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange'> {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /**
   * Unit appended to the readout chip, e.g. "%" or " Hz". Empty by default —
   * a percent sign on a 1–10 sensitivity slider would be a lie.
   */
  suffix?: string
  /** Hide the value chip next to the label. */
  hideValue?: boolean
}

/**
 * Range control (F1.7) — extracted from `settings-modal.tsx`.
 *
 * The filled track is painted with a live gradient so the red accent shows
 * progress without an extra DOM layer. Native `<input type="range">` keeps
 * full keyboard support (arrows, Home/End) for free.
 */
export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
  hideValue = false,
  className,
  id,
  disabled,
  ...props
}: SliderProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div className={cn('w-full', disabled && 'opacity-50', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 flex items-center justify-between gap-3 text-sm text-text-high"
        >
          <span>{label}</span>
          {!hideValue && (
            <span className="rounded-sm bg-white/5 px-2 py-0.5 font-display text-xs font-bold tabular-nums text-primary">
              {value}
              {suffix}
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background',
          '[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(229,53,43,0.6)]',
          '[&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110',
          '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary',
        )}
        style={{
          background: `linear-gradient(to right, var(--primary) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
        {...props}
      />
    </div>
  )
}
