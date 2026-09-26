import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Sizes changed in P6.1. The default used to be `h-8` — 32px, well under the
 * 44px a finger needs — and roughly forty call sites had already written
 * `className="h-10"` to get round it. A primitive whose default is wrong
 * everywhere is not a default; it is a tax. The default is now 40px, `lg` is
 * 44px for the one real action on a screen, and `sm` keeps the old 32px for a
 * button that sits inside a table row.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[background-color,border-color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The one action a screen is for. Navy, lifted, and it gets *lighter*
        // under the cursor — `bg-primary/90` only washed it toward the page.
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md active:bg-primary-active active:shadow-xs",
        // A second action of equal weight beside the navy one.
        brass:
          "bg-brass text-primary-foreground shadow-sm hover:bg-brass-strong hover:shadow-md active:shadow-xs",
        outline:
          "border-border bg-card shadow-xs hover:border-ring/45 hover:bg-brass-tint hover:text-brass-strong aria-expanded:border-ring/45 aria-expanded:bg-brass-tint",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_7%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-muted-foreground hover:bg-secondary hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground",
        // Solid, because every place this is used is the confirm button of a
        // dialog that cancels a bill or an entry. It should look like what it
        // does; a tint read as one more thing to click past.
        destructive:
          "bg-destructive text-primary-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/30 active:shadow-xs",
        // The tinted version, for a destructive choice offered in a row rather
        // than confirmed in a dialog.
        "destructive-soft":
          "bg-destructive/8 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/30",
        link: "text-primary underline underline-offset-4 decoration-brass/40 hover:decoration-brass",
      },
      size: {
        xs: "h-7 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-3 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-10 gap-2 px-3.5 text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        // The primary action on a screen: 44px, the touch target a counter
        // needs, and heavy enough to be the thing the eye lands on.
        lg: "h-11 gap-2 px-5 text-md font-semibold has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-4.5",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8 rounded-md",
        icon: "size-10",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
