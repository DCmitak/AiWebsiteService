type Kind = "facebook" | "instagram" | "tiktok" | "youtube";

export function SocialIcon({
  href,
  label,
  kind,
}: {
  href: string;
  label: string;
  kind: Kind;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noreferrer"
      className="h-10 w-10 rounded-full bg-white/70 border border-black/10 grid place-items-center hover:bg-white/85 transition"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/icons/social/${kind}.svg`}
        alt=""
        className="h-[18px] w-[18px] opacity-80"
      />
    </a>
  );
}
