import PageHeader from '../components/PageHeader'

interface PlaceholderPageProps {
  title: string
  description: string
}

// 1단계에서 실제 화면으로 바꿀 임시 화면입니다.
export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section>
      <PageHeader title={title} />
      <div className="card">
        <p>{description}</p>
        <p className="muted">준비 중입니다.</p>
      </div>
    </section>
  )
}
