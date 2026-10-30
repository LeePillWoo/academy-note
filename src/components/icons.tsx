import type { ReactNode } from 'react'

export function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const BackIcon = () => <Icon><path d="M15 5l-7 7 7 7" /></Icon>
export const ChevronRightIcon = () => <Icon size={20}><path d="M9 5l7 7-7 7" /></Icon>
export const ArrowUpIcon = () => <Icon size={20}><path d="M12 19V5M6 11l6-6 6 6" /></Icon>
export const ArrowDownIcon = () => <Icon size={20}><path d="M12 5v14M6 13l6 6 6-6" /></Icon>
export const PlusIcon = () => <Icon size={20}><path d="M12 5v14M5 12h14" /></Icon>
export const CalendarIcon = () => <Icon size={20}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>
export const TrashIcon = () => <Icon size={20}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>
