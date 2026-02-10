"use client";

interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type"
  > {
  value: string | number | null;
  onChange: (value: string) => void;
}

function formatWithCommas(val: string | number | null | undefined): string {
  if (val === "" || val === null || val === undefined) return "";
  const str = typeof val === "number" ? val.toString() : val;
  const cleaned = str.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";

  const parts = cleaned.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? parts[0] + "." + parts[1] : parts[0];
}

export function CurrencyInput({
  value,
  onChange,
  className = "",
  ...props
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    // Only allow one decimal point
    const dotIndex = raw.indexOf(".");
    if (dotIndex !== -1 && raw.indexOf(".", dotIndex + 1) !== -1) return;
    onChange(raw);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none select-none">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={formatWithCommas(value)}
        onChange={handleChange}
        className={`pl-7 ${className}`}
        {...props}
      />
    </div>
  );
}
