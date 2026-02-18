import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[rgba(202,255,4,0.10)] text-[#CAFF04] dark:text-[#CAFF04] [border-width:1.5px] border-[rgba(202,255,4,0.25)] [a&]:hover:bg-[rgba(202,255,4,0.15)]",
        secondary:
          "bg-secondary text-secondary-foreground [border-width:1.5px] border-border [a&]:hover:bg-secondary/90",
        destructive:
          "bg-[rgba(255,69,58,0.07)] text-[#FF453A] [border-width:1.5px] border-[rgba(255,69,58,0.25)] [a&]:hover:bg-[rgba(255,69,58,0.12)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success:
          "bg-[rgba(34,197,94,0.07)] text-[#22C55E] [border-width:1.5px] border-[rgba(34,197,94,0.25)] [a&]:hover:bg-[rgba(34,197,94,0.12)]",
        warning:
          "bg-[rgba(255,159,10,0.07)] text-[#FF9F0A] [border-width:1.5px] border-[rgba(255,159,10,0.25)] [a&]:hover:bg-[rgba(255,159,10,0.12)]",
        outline:
          "text-foreground [border-width:1.5px] border-border [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        neutral:
          "bg-white/5 dark:bg-white/5 text-muted-foreground [border-width:1.5px] border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
