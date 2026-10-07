export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="26" fill="#111113" />
      <rect x="31" y="18" width="17" height="58" rx="3" fill="#fff" />
      <rect x="20" y="33" width="40" height="14" rx="3" fill="#fff" />
      <rect x="31" y="63" width="32" height="13" rx="3" fill="#fff" />
      <circle cx="73" cy="69.5" r="7.5" fill="#FF4D00" />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo" aria-label="trackr.">
      <LogoMark size={size} />
      <span className="logo__word" style={{ fontSize: size * 0.82 }} aria-hidden="true">
        trackr<span className="logo__dot">.</span>
      </span>
    </span>
  );
}
