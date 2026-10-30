import { useEffect, useRef, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose(): void
  /** 화면 읽기 프로그램에 읽어줄 창 이름 */
  label: string
  children: ReactNode
}

/**
 * 휴대폰에서는 아래에서 올라오고, 넓은 화면에서는 가운데 뜨는 창.
 * 바깥(어두운 부분)을 누르거나 뒤로 가기(Esc)를 누르면 닫힙니다.
 */
export default function Sheet({ open, onClose, label, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="sheet" aria-label={label} onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}>
      {open && <div className="sheet-body">{children}</div>}
    </dialog>
  )
}
