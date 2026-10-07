import { Minus, Plus } from "lucide-react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  label: string;
  decimals?: number;
  suffix?: string;
}

export function Stepper({ value, onChange, step, min = 0, max = 99999, label, decimals = 0, suffix }: Props) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(decimals))));
  return (
    <div className="stepper">
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))}>
        <Minus size={20} strokeWidth={2.5} />
      </button>
      <div style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", minWidth: 0 }}>
        <input
          aria-label={label}
          inputMode={decimals ? "decimal" : "numeric"}
          value={Number.isFinite(value) ? String(value) : ""}
          size={Math.max(2, String(value).length)}
          style={{ flex: "none", width: `${Math.max(2, String(value).length) + 0.5}ch` }}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(",", "."));
            onChange(Number.isNaN(v) ? 0 : Math.min(max, v));
          }}
          onBlur={() => onChange(clamp(value))}
          onFocus={(e) => e.target.select()}
        />
        {suffix && <span className="unit">{suffix}</span>}
      </div>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))}>
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
}
