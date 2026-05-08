import Image from "next/image";
import Link from "next/link";

type BrandSize = "sm" | "md" | "lg";

const sizeMap = {
  sm: { icon: 28, text: "text-[0.95rem]", gap: "gap-2" },
  md: { icon: 36, text: "text-[1.05rem]", gap: "gap-2.5" },
  lg: { icon: 44, text: "text-[1.35rem]", gap: "gap-3" },
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
      <Image
        src="/logo-icon.png"
        alt="Text Humanica logo"
        width={s.icon}
        height={s.icon}
        className="shrink-0 rounded-[7px] transition-transform duration-300 group-hover:scale-105"
        priority
      />

      <span className={`brand-wordmark ${s.text} text-slate-950`}>
        Text <span className="brand-wordmark-accent">Humanica</span>
      </span>
    </Link>
  );
}
