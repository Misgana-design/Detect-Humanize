/**
 * Shared brand mark — used in Navbar, Footer, Sidebar, and any other location
 * where the Text Humanica logo appears. Keeps the icon and wordmark consistent.
 *
 * Icon: your custom /logo-icon.png (restored as-is)
 * Font: Syne — geometric, elegant, used by Linear/Framer-style AI startups
 */

import Link from "next/link";
import Image from "next/image";

type BrandSize = "sm" | "md" | "lg";

const sizeMap = {
  sm: { icon: 28, text: "text-sm",  gap: "gap-2"   },
  md: { icon: 36, text: "text-base",gap: "gap-2.5" },
  lg: { icon: 44, text: "text-xl",  gap: "gap-3"   },
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
      {/* Your custom logo image — unchanged */}
      <Image
        src="/humanica icon 2.ico"
        alt="Text Humanica logo"
        width={s.icon}
        height={s.icon}
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
        priority
      />

      {/* Wordmark — Syne for premium AI startup feel */}
      <span
        className={`${s.text} font-(family-name:--font-syne) font-bold tracking-tight text-slate-900`}
      >
        Text <span className="text-indigo-600">Humanica</span>
      </span>
    </Link>
  );
}
