import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-button hover:shadow-neon",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-transparent hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        neon: "bg-primary text-primary-foreground shadow-neon hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]",
        cyan: "bg-secondary text-secondary-foreground shadow-cyan hover:shadow-[0_0_40px_hsl(var(--secondary)/0.5)]",
        glass: "bg-card/80 backdrop-blur-xl text-foreground hover:bg-card/90 border border-border/50",
        hero: "bg-primary text-primary-foreground text-lg font-bold shadow-neon hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] hover:scale-105",
        // Premium neon green button - Gauth-style with glowing border
        neonGreen: "relative bg-background text-primary font-bold border-2 border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4),inset_0_0_20px_hsl(var(--primary)/0.1)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.6),inset_0_0_25px_hsl(var(--primary)/0.15)] hover:border-primary/90 hover:bg-primary/5",
        // Filled neon green button variant
        neonGreenFilled: "bg-primary text-primary-foreground font-bold border-2 border-primary shadow-[0_0_25px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] hover:bg-primary/90",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
        "icon-lg": "h-14 w-14",
        "icon-xl": "h-20 w-20 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
