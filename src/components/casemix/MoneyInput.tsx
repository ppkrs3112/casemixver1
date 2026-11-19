import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function MoneyInput({
  id,
  label,
  value,
  onChange,
  disabled,
  hint,
  warn,
  className,
  strong,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  hint?: string;
  warn?: boolean;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
        <Input
          id={id}
          inputMode="numeric"
          disabled={disabled}
          value={value ? value.toLocaleString("id-ID") : ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
          className={cn("tabular pl-9", strong && "text-base font-bold", warn && "border-destructive bg-destructive-soft")}
        />
      </div>
      {hint && <p className={cn("text-[11px]", warn ? "font-semibold text-destructive" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
