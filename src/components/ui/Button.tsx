import { cn } from "@/lib/utils"; // Utility to merge classes
import { VariantProps, cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus:outline-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
        secondary:
          "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm",
        ghost: "hover:bg-slate-100 text-slate-600",
        outline:
          "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4",
        lg: "h-14 px-10 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export const Button = ({ className, variant, size, ...props }: any) => (
  <button
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  />
);
