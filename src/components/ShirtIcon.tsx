'use client';

interface Props {
  primaryColor: string;
  secondaryColor: string;
  number?: number | null;
  size?: number;
  className?: string;
}

export default function ShirtIcon({ primaryColor, secondaryColor, number, size = 48, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shirt body */}
      <path
        d="M16 20L8 14L14 8L22 6C24 10 28 12 32 12C36 12 40 10 42 6L50 8L56 14L48 20V56H16V20Z"
        fill={primaryColor}
        stroke={secondaryColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Collar */}
      <path
        d="M22 6C24 10 28 12 32 12C36 12 40 10 42 6"
        stroke={secondaryColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Sleeves outline */}
      <path
        d="M8 14L14 8M56 14L50 8"
        stroke={secondaryColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Number */}
      {number && (
        <text
          x="32"
          y="42"
          textAnchor="middle"
          fill={secondaryColor}
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          {number}
        </text>
      )}
    </svg>
  );
}
