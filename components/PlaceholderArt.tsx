function seedFromString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const PALETTES = [
  ["#F7F3ED", "#EFE1DE", "#C9A876"],
  ["#241F1C", "#8C7A5E", "#E4CB9C"],
  ["#EFE1DE", "#C98D8A", "#C9A876"],
  ["#F7F3ED", "#9C7C4D", "#EFE1DE"],
];

/**
 * Deterministic abstract "charm" artwork used in place of real product
 * photography. Swap product.image for a real file path in
 * /public/images/products and <ProductImage> will render it instead —
 * no other code needs to change.
 */
export default function PlaceholderArt({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const n = seedFromString(seed);
  const palette = PALETTES[n % PALETTES.length];
  const [bg, mid, accent] = palette;
  const cx = 100 + (n % 40) - 20;
  const cy = 100 + ((n >> 3) % 40) - 20;
  const r1 = 38 + (n % 24);
  const r2 = 20 + ((n >> 4) % 18);
  const rot = n % 360;
  const shapeType = n % 3;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Decorative product artwork"
    >
      <rect width="200" height="200" fill={bg} />
      <g transform={`rotate(${rot} 100 100)`} opacity="0.9">
        {shapeType === 0 && (
          <>
            <circle cx={cx} cy={cy} r={r1} fill={mid} opacity="0.35" />
            <circle cx={100} cy={100} r={r2} fill="none" stroke={accent} strokeWidth="3" />
            <circle cx={100} cy={100} r={4} fill={accent} />
          </>
        )}
        {shapeType === 1 && (
          <>
            <rect x={cx - r1 / 2} y={cy - r1 / 2} width={r1} height={r1} rx="14" fill={mid} opacity="0.35" />
            <path
              d={`M ${100 - r2} 100 Q 100 ${100 - r2 * 1.4} ${100 + r2} 100 Q 100 ${100 + r2 * 1.4} ${100 - r2} 100 Z`}
              fill="none"
              stroke={accent}
              strokeWidth="3"
            />
          </>
        )}
        {shapeType === 2 && (
          <>
            <polygon
              points={`100,${100 - r1} ${100 + r1 * 0.87},${100 + r1 * 0.5} ${100 - r1 * 0.87},${100 + r1 * 0.5}`}
              fill={mid}
              opacity="0.3"
            />
            <circle cx={100} cy={100} r={r2 * 0.6} fill="none" stroke={accent} strokeWidth="3" />
          </>
        )}
      </g>
      <line x1="0" y1="0" x2="200" y2="200" stroke={accent} strokeWidth="0.5" opacity="0.15" />
    </svg>
  );
}
