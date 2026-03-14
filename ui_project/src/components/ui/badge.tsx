import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground border-destructive/40 hover:bg-destructive/90",
        outline: "text-foreground border-border hover:bg-muted",
        success: "bg-success text-success-foreground border-success/40 hover:bg-success/90",
        info: "bg-info text-info-foreground border-info/40 hover:bg-info/90",
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
