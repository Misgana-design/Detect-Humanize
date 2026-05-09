/**
 * Shared brand mark — used in Navbar, Footer, Sidebar, and any other location
 * where the Text Humanica logo appears.
 *
 * Icon: your custom /logo-icon.png
 * Font: DM Sans — balanced, premium, used by Notion/Loom-style AI startups
 */

import Link from "next/link";
import Image from "next/image";

type BrandSize = "sm" | "md" | "lg";

const sizeMap = {
  sm: { icon: 28, textClass: "text-[0.9rem]",  gap: "gap-2"   },
  md: { icon: 34, textClass: "text-[1rem]",    gap: "gap-2.5" },
  lg: { icon: 42, textClass: "text-[1.25rem]", gap: "gap-3"   },
};

export function Brand({
  size = "md",
  href = "/",
  onClick,
}: {
  size?: BrandSize;
  href?: string;
  onClick?: () => void;
}) {
  const s = sizeMap[size];

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group inline-flex items-center ${s.gap} select-none`}
    >
      {/* Your custom logo image */}
      <Image
        src="/logo-icon.png"
        alt="Text Humanica logo"
        width={s.icon}
        height={s.icon}
        className="shrink-0 rounded-[7px] transition-transform duration-300 group-hover:scale-105"
        priority
      />

      {/* Wordmark — DM Sans for premium, balanced feel */}
      <span className={`brand-wordmark ${s.textClass} text-slate-950`}>
        Text{" "}
        <span className="brand-wordmark-accent">Humanica</span>
      </span>
    </Link>
  );
}
