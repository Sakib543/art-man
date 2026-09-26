import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The salon's own logo — "ART", the moustache, "MEN'S SALON".
 *
 * It replaced a scissors glyph from the icon set, which was a placeholder
 * standing in for a brand nobody had handed over yet. The client gave us the
 * real one on 2026-09-23.
 *
 * Two files, not one with a CSS filter: the artwork arrived as dark ink on
 * white, and on the navy panels it has to be cream. `public/logo.png` keeps
 * the original black and brown for light surfaces and for the printed receipt;
 * `public/logo-light.png` is the same silhouette flattened to cream. Both have
 * the white background cut away — see the note in `docs/HANDOFF.md` for how,
 * because a JPEG's ringing does not come off with a plain colour key.
 *
 * Size comes from the caller, as a height: `className="h-10"`. The width
 * follows the artwork's own 408 × 278.
 */
export function SalonLogo({
  onDark = false,
  className,
  priority = false,
}: {
  /** True on the navy sidebar, drawer, top bar and login panel. */
  onDark?: boolean;
  className?: string;
  /** The login screen and the sidebar are above the fold; nothing else is. */
  priority?: boolean;
}) {
  return (
    <Image
      src={onDark ? "/logo-light.png" : "/logo.png"}
      alt="Art Men's Salon"
      width={408}
      height={278}
      priority={priority}
      /*
       * `object-contain` is the belt to `w-auto`'s braces. A flex column
       * stretches its children across the cross axis by default, which rendered
       * this 232 x 44 — a ratio of 5.3 against the artwork's 1.47 — until the
       * lockup below was told not to. `object-contain` means the next container
       * that tries it letterboxes the logo instead of smearing it.
       */
      className={cn("w-auto shrink-0 object-contain select-none", className)}
    />
  );
}

/**
 * The logo as the sidebar and the drawer show it. `items-start` is what keeps
 * the flex column from stretching the image (see `SalonLogo`).
 */
export function BrandLockup({ onDark = false, compact = false }: { onDark?: boolean; compact?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-start">
      <SalonLogo onDark={onDark} priority className={compact ? "h-9" : "h-21"} />
    </div>
  );
}
