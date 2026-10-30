import { useLocation, useNavigate } from 'react-router'

/**
 * 이전 화면으로 돌아갑니다.
 * 주소를 직접 열어서 이전 화면이 없으면 fallback 주소로 갑니다.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
