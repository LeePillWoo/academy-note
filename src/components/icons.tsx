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
