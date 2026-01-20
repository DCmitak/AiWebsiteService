import * as React from "react";

type Variant = "primary" | "secondary";

type ThemeButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

export default function ThemeButton({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ThemeButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-semibold transition";

  const variantClass =
    variant === "primary"
      ? "text-white shadow-sm hover:shadow-md"
      : "border border-black/10 bg-white/40 text-black/80 hover:bg-white/60";

  const widthClass = fullWidth ? "w-full text-center" : "";

  const classes = [base, variantClass, widthClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <a {...props} className={classes}>
      {children}
    </a>
  );
}
