import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "bg-white text-black border-white/20 hover:bg-zinc-200",
        secondary: "bg-zinc-800 text-white border-white/10 hover:bg-zinc-700",
        destructive: "bg-red-600 text-white border-red-500/40 hover:bg-red-500",
        outline: "text-white border-white/15 hover:bg-white/5",
        success:
          "bg-emerald-600 text-white border-emerald-500/40 hover:bg-emerald-500",
        info: "bg-zinc-700 text-white border-white/10 hover:bg-zinc-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
