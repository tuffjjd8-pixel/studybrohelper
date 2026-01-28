import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ------------------------------------------------------------
// BUTTON VARIANTS (includes neonGreen + neonGreenFilled + icon-xl)
// ------------------------------------------------------------
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-button hover:shadow-neon",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-muted hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",

        // Neon glow border (unfilled)
        neonGreen:
          "relative bg-background text-primary font-bold border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4),inset_0_0_20px_hsl(var(--primary)/0.1)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6),inset_0_0_25px_hsl(var(--primary)/0.15)] hover:border-primary/90 hover:bg-primary/5",

        // Filled neon green (THIS IS THE ONE YOUR CIRCLE USES)
        neonGreenFilled:
          "bg-primary text-primary-foreground font-bold border-2 border-primary shadow-[0_0_25px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] hover:bg-primary/90",
      },

      size: {
        default: "h-11 px-5 py-2 rounded-xl",
        sm: "h-9 px-3 text-xs rounded-lg",
        lg: "h-12 px-8 text-base rounded-xl",
        xl: "h-14 px-10 text-lg rounded-2xl",

        // Icon sizes
        icon: "h-11 w-11 rounded-full",
        "icon-lg": "h-14 w-14 rounded-full",

        // THE PERFECT CIRCLE YOU WANT
        "icon-xl": "h-20 w-20 rounded-full",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// ------------------------------------------------------------
// BUTTON COMPONENT
// ------------------------------------------------------------
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
