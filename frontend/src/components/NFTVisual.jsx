import { Gamepad2, Palette, Music, Diamond, Package, Sparkles, Zap } from 'lucide-react';

// Simple deterministic hash from string
function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Derive a seeded pseudo-random number generator
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate HSL color from seed values
function hslColor(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const assetTypeIcons = {
  gaming: Gamepad2,
  art: Palette,
  music: Music,
  collectible: Diamond,
  digital_asset: Package,
  royalty: Sparkles,
  other: Zap,
};

const assetTypeLabels = {
  gaming: 'Gaming',
  art: 'Art',
  music: 'Music',
  collectible: 'Collectible',
  digital_asset: 'Digital Asset',
  royalty: 'Royalty',
  other: 'NFT',
};

export default function NFTVisual({ nft, size = 'card' }) {
  const seed = hashStr(nft.id?.toString() || nft.token_id || nft.asset_name || 'default');
  const rand = seededRandom(seed);

  // Generate color palette
  const baseHue = Math.floor(rand() * 360);
  const hue2 = (baseHue + 40 + Math.floor(rand() * 80)) % 360;
  const hue3 = (baseHue + 180 + Math.floor(rand() * 60)) % 360;

  const color1 = hslColor(baseHue, 60 + rand() * 20, 25 + rand() * 15);
  const color2 = hslColor(hue2, 50 + rand() * 30, 20 + rand() * 15);
  const color3 = hslColor(hue3, 70 + rand() * 20, 50 + rand() * 15);
  const accentColor = hslColor(baseHue, 80, 65);

  // Generate shapes
  const shapes = [];
  const shapeCount = 4 + Math.floor(rand() * 5);

  for (let i = 0; i < shapeCount; i++) {
    const type = Math.floor(rand() * 4); // 0=circle, 1=ring, 2=line, 3=polygon
    const cx = rand() * 100;
    const cy = rand() * 100;
    const r = 8 + rand() * 30;
    const opacity = 0.08 + rand() * 0.2;
    const strokeWidth = 1 + rand() * 2;

    if (type === 0) {
      // Filled circle
      shapes.push(
        <circle
          key={i}
          cx={`${cx}%`}
          cy={`${cy}%`}
          r={r}
          fill={i % 2 === 0 ? color3 : accentColor}
          opacity={opacity}
        />
      );
    } else if (type === 1) {
      // Ring
      shapes.push(
        <circle
          key={i}
          cx={`${cx}%`}
          cy={`${cy}%`}
          r={r}
          fill="none"
          stroke={color3}
          strokeWidth={strokeWidth}
          opacity={opacity + 0.1}
        />
      );
    } else if (type === 2) {
      // Diagonal line
      const x2 = cx + (rand() - 0.5) * 60;
      const y2 = cy + (rand() - 0.5) * 60;
      shapes.push(
        <line
          key={i}
          x1={`${cx}%`}
          y1={`${cy}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      );
    } else {
      // Hexagon-ish polygon
      const points = [];
      const sides = 5 + Math.floor(rand() * 3);
      for (let j = 0; j < sides; j++) {
        const angle = (j / sides) * Math.PI * 2 + rand() * 0.3;
        const pr = r * (0.7 + rand() * 0.3);
        points.push(`${cx + Math.cos(angle) * pr}%,${cy + Math.sin(angle) * pr}%`);
      }
      shapes.push(
        <polygon
          key={i}
          points={points.join(' ')}
          fill="none"
          stroke={color3}
          strokeWidth={strokeWidth}
          opacity={opacity + 0.05}
        />
      );
    }
  }

  // Grid pattern (subtle)
  const gridSpacing = 12 + Math.floor(rand() * 8);
  const gridOpacity = 0.04 + rand() * 0.04;
  const gridRotation = Math.floor(rand() * 45);

  // Large central glow
  const glowX = 30 + rand() * 40;
  const glowY = 30 + rand() * 40;

  const Icon = assetTypeIcons[nft.asset_type] || assetTypeIcons.other;
  const label = assetTypeLabels[nft.asset_type] || 'NFT';
  const isDetail = size === 'detail';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Base gradient */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`bg-${seed}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </radialGradient>
          <radialGradient id={`glow-${seed}`} cx={`${glowX}%`} cy={`${glowY}%`} r="45%">
            <stop offset="0%" stopColor={color3} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color3} stopOpacity="0" />
          </radialGradient>
          <pattern
            id={`grid-${seed}`}
            width={gridSpacing}
            height={gridSpacing}
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${gridRotation})`}
          >
            <path
              d={`M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}`}
              fill="none"
              stroke="white"
              strokeWidth="0.5"
              opacity={gridOpacity}
            />
          </pattern>
        </defs>

        {/* Background */}
        <rect width="200" height="200" fill={`url(#bg-${seed})`} />

        {/* Grid overlay */}
        <rect width="200" height="200" fill={`url(#grid-${seed})`} />

        {/* Central glow */}
        <rect width="200" height="200" fill={`url(#glow-${seed})`} />

        {/* Decorative shapes */}
        <g>{shapes}</g>
      </svg>

      {/* Center icon + label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div
          className="rounded-2xl backdrop-blur-sm flex items-center justify-center"
          style={{
            width: isDetail ? 80 : 48,
            height: isDetail ? 80 : 48,
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Icon
            style={{ color: accentColor }}
            className={isDetail ? 'w-10 h-10' : 'w-6 h-6'}
          />
        </div>
        <p
          className={`mt-2 font-semibold capitalize ${
            isDetail ? 'text-base' : 'text-xs'
          }`}
          style={{ color: accentColor, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          {label}
        </p>
        {nft.royalty_percentage && (
          <p
            className={`font-bold text-purple-400 ${isDetail ? 'text-sm mt-1' : 'text-[10px]'}`}
          >
            {nft.royalty_percentage}% Royalty
          </p>
        )}
      </div>
    </div>
  );
}

// Export the icon map for use in other components
export { assetTypeIcons, assetTypeLabels };
