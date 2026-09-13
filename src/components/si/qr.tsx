import { encode } from "uqr";
import { cn } from "@/lib/utils";

export function QrCode({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const { data, size } = encode(value, { border: 2, ecc: "M" });
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y][x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <figure className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-44 rounded-lg bg-milk p-2 text-night"
        role="img"
        aria-label={label ?? value}
      >
        <path d={d} fill="currentColor" />
      </svg>
    </figure>
  );
}
