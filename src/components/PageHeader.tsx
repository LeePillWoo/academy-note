import { useGoBack } from '../hooks/useGoBack'
import { BackIcon } from './icons'

interface PageHeaderProps {
  title: string
  /** 있으면 뒤로 가기 단추를 보여주고, 이전 화면이 없을 때 이 주소로 갑니다. */
  backTo?: string
}

export default function PageHeader({ title, backTo }: PageHeaderProps) {
  return (
    <div className="page-header">
      {backTo && <BackButton fallback={backTo} />}
      <h1 className="page-title">{title}</h1>
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
