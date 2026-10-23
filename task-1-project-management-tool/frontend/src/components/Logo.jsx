export default function Logo({ light = false, size = 28 }) {
  const side = light ? '#7fb8b0' : '#0a5f58';
  const mid = light ? '#ffffff' : '#0f1729';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="4" width="6" height="24" rx="3" fill={side} />
      <rect x="13" y="4" width="6" height="14" rx="3" fill={mid} />
      <rect x="22" y="4" width="6" height="8" rx="3" fill={side} />
    </svg>
  );
}
