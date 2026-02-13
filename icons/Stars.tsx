
import React from 'react';

export function Star22({
  color,
  size,
  stroke,
  strokeWidth,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  color?: string
  size?: number
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 200 200"
      width={size ?? 24}
      height={size ?? 24}
      className={className}
      {...props}
    >
      <path
        fill={color ?? "currentColor"}
        stroke={stroke}
        strokeWidth={strokeWidth}
        d="M158.603 100c78.169 75.604 16.906 136.867-58.603 58.603C24.396 236.867-36.867 175.604 41.397 100-36.867 24.396 24.396-36.867 100 41.397 175.604-36.867 236.867 24.396 158.603 100"
      />
    </svg>
  )
}

export function Star8({
  color,
  size,
  stroke,
  strokeWidth,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  color?: string
  size?: number
  stroke?: string
  strokeWidth?: number
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 200 200"
      width={size ?? 24}
      height={size ?? 24}
      className={className}
      {...props}
    >
      <path
        fill={color ?? "currentColor"}
        stroke={stroke}
        strokeWidth={strokeWidth}
        d="M100 5s5.088 49.035 25.527 69.473C145.965 94.912 195 100 195 100s-49.035 5.088-69.473 25.527C105.088 145.965 100 195 100 195s-5.088-49.035-25.527-69.473C54.035 105.088 5 100 5 100s49.035-5.088 69.473-25.527C94.912 54.035 100 5 100 5"
      />
    </svg>
  )
}
