import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.leepillwoo.academynote',
  appName: '학원노트',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      // 상태 표시줄에 나오는 작은 아이콘(흰색 실루엣)과 색. android/app/src/main/res/drawable/ic_stat_notify.xml
      smallIcon: 'ic_stat_notify',
      iconColor: '#4F46E5',
    },
  },
}

export default config
