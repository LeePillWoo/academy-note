import type { ReactNode } from 'react'
import { useGoBack } from '../hooks/useGoBack'
import { BackIcon } from './icons'

interface PageHeaderProps {
  title: string
  /** 제목 아래 한 줄 설명 */
  subtitle?: string
  /** 있으면 뒤로 가기 단추를 보여주고, 이전 화면이 없을 때 이 주소로 갑니다. */
  backTo?: string
  /** 제목 오른쪽에 둘 단추 (좁은 화면에서는 아래로) */
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-heading">
        {backTo && <BackButton fallback={backTo} />}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

function BackButton({ fallback }: { fallback: string }) {
  const goBack = useGoBack(fallback)
  return (
    <button type="button" className="icon-btn back-btn" onClick={goBack} aria-label="뒤로">
      <BackIcon />
    </button>
  )
}
