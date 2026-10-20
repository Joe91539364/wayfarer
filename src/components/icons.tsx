import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconLock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </svg>
);

export const IconUnlock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 7.4-2" />
  </svg>
);

export const IconAlert = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.6 21 19.4H3L12 3.6Z" />
    <path d="M12 9.5v4.2M12 16.6v.6" />
  </svg>
);

export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.8 12.6 9.6 17.4 19.4 6.8" />
  </svg>
);

export const IconX = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconPlus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.8 7h14.4M9.4 7V4.8h5.2V7M6.6 7l.9 12.2h9l.9-12.2" />
  </svg>
);

export const IconSwap = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.6 8.4h13.2l-2.8-2.8M19.4 15.6H6.2l2.8 2.8" />
  </svg>
);

export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8.4 5.6 15 12l-6.6 6.4" />
  </svg>
);

export const IconCalendar = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3.8" y="5.4" width="16.4" height="15" rx="2.2" />
    <path d="M3.8 10h16.4M8.4 3.6v3.4M15.6 3.6v3.4" />
  </svg>
);

export const IconPin = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21s6.2-6.1 6.2-10.6A6.2 6.2 0 0 0 5.8 10.4C5.8 14.9 12 21 12 21Z" />
    <circle cx="12" cy="10.2" r="2.3" />
  </svg>
);

export const IconWalk = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="13" cy="4.4" r="1.9" />
    <path d="M11.4 8.2 9 12.4l2.4 2.2-.8 5M13.6 8.4l2.2 3.2 2.6.8M11.6 14.6l-3.2 5" />
  </svg>
);

export const IconCar = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 15.4h16M5.6 15.4 7 8.4h10l1.4 7M4 15.4v3h2.6v-2M20 15.4v3h-2.6v-2" />
    <circle cx="8" cy="12.6" r=".9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12.6" r=".9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTrain = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="6" y="3.6" width="12" height="13.4" rx="2.4" />
    <path d="M6 11h12M9.4 20.4l1.6-3.4M14.6 20.4 13 17" />
    <circle cx="9.4" cy="14" r=".8" fill="currentColor" stroke="none" />
    <circle cx="14.6" cy="14" r=".8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconDownload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.8v11.4M7.8 11l4.2 4.2 4.2-4.2M4.6 19.4h14.8" />
  </svg>
);

export const IconUpload = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 15.4V4M7.8 8.2 12 4l4.2 4.2M4.6 19.4h14.8" />
  </svg>
);

export const IconSpark = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.4l1.8 5.2 5.2 1.8-5.2 1.8L12 17.4l-1.8-5.2L5 10.4l5.2-1.8L12 3.4Z" />
    <path d="M18.6 16.2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
  </svg>
);

export const IconRefresh = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 11.4A8 8 0 0 0 6.2 6.6L4 8.8M4 4.6v4.2h4.2M4 12.6a8 8 0 0 0 13.8 4.8L20 15.2M20 19.4v-4.2h-4.2" />
  </svg>
);

export const IconArrow = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4.8 12h13.4M13.2 6.8 18.6 12l-5.4 5.2" />
  </svg>
);

export const IconMenu = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="5.4" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18.6" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLink = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9.6 14.4 14.4 9.6" />
    <path d="M11.2 6.8 13 5a3.8 3.8 0 0 1 5.4 5.4l-1.8 1.8" />
    <path d="M12.8 17.2 11 19a3.8 3.8 0 0 1-5.4-5.4l1.8-1.8" />
  </svg>
);

export const IconBell = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 12a3 3 0 0 1 6 0c0 2.6 1 3.9 1.8 4.8.3.4 0 .9-.5.9H7.7c-.5 0-.8-.5-.5-.9C8 15.9 9 14.6 9 12z" />
    <path d="M10.6 20.4a1.9 1.9 0 0 0 2.8 0" />
  </svg>
);

export const IconCopy = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="8.5" y="8.5" width="11" height="11.5" rx="2" />
    <path d="M6 15.5V6.8A2.8 2.8 0 0 1 8.8 4h6.4" />
  </svg>
);

export const IconCompass = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M15.2 8.8l-1.9 4.4-4.5 1.9 1.9-4.4z" />
  </svg>
);

/** 幸福时刻用的心。默认描边，加 .on 类就是实心（见 styles.css） */
export const IconHeart = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 20.1c-1-.7-7.6-5-7.6-9.6a4.3 4.3 0 0 1 7.6-2.6 4.3 4.3 0 0 1 7.6 2.6c0 4.6-6.6 8.9-7.6 9.6Z" />
  </svg>
);
