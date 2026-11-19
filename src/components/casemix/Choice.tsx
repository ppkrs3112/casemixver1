import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function Choice({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
  id: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value || "__empty"} onValueChange={(v) => onChange(v === "__empty" ? "" : v)}>
        <SelectTrigger id={id} className="bg-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const v = typeof o === "string" ? o : o.value;
            return (
              <SelectItem key={v || "__empty"} value={v || "__empty"}>
                {typeof o === "string" ? o : o.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
