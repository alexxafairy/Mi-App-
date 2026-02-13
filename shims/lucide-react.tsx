
import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
};

const IconBase: React.FC<IconProps> = ({ size = 20, children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const makeIcon = (children: React.ReactNode): React.FC<IconProps> => {
  const C: React.FC<IconProps> = (props) => <IconBase {...props}>{children}</IconBase>;
  return C;
};

export const Trash2 = makeIcon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>
);

export const Camera = makeIcon(
  <>
    <path d="M3 7h4l2-2h6l2 2h4v13H3z" />
    <circle cx="12" cy="13" r="4" />
  </>
);

export const RefreshCw = makeIcon(
  <>
    <path d="M21 2v6h-6" />
    <path d="M3 22v-6h6" />
    <path d="M20 8a9 9 0 0 0-15-3L3 8" />
    <path d="M4 16a9 9 0 0 0 15 3l2-3" />
  </>
);

export const Wand2 = makeIcon(
  <>
    <path d="M21 7 7 21" />
    <path d="m14.5 6.5 3 3" />
    <path d="M7 3v2" />
    <path d="M3 7h2" />
    <path d="M17 3v2" />
  </>
);

export const Plus = makeIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);

export const Sparkles = makeIcon(
  <>
    <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" />
    <path d="M5 3v2" />
    <path d="M3 5h2" />
    <path d="M19 16v2" />
    <path d="M17 18h2" />
  </>
);

export const ChevronDown = makeIcon(<path d="m6 9 6 6 6-6"/>);

export const CheckCircle2 = makeIcon(
  <>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </>
);

export const Image = makeIcon(
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </>
);

export const Calendar = makeIcon(
  <>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </>
);

export default {
  Trash2,
  Camera,
  RefreshCw,
  Wand2,
  Plus,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Image,
  Calendar
};
