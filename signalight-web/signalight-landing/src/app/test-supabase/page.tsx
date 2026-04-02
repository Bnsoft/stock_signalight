'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [data, setData] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function checkConnection() {
      try {
        // watchlist 테이블에서 데이터 1개만 가져와 봅니다.
        const { data, error } = await supabase
          .from('watchlist')
          .select('*')
          .limit(1)

        if (error) throw error
        
        setData(data || [])
        setStatus('success')
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || 'Unknown error')
        setStatus('error')
      }
    }

    checkConnection()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Supabase Connection Test</h1>
      
      {status === 'loading' && <p>⏳ 연결 확인 중...</p>}
      
      {status === 'success' && (
        <div style={{ color: 'green' }}>
          <p>✅ 연결 성공!</p>
          <p>DB에서 읽어온 데이터 개수: {data.length}개</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      {status === 'error' && (
        <div style={{ color: 'red' }}>
          <p>❌ 연결 실패</p>
          <p>에러 메시지: {errorMsg}</p>
          <p>Vercel의 환경변수(NEXT_PUBLIC_...) 설정을 다시 확인해 주세요.</p>
        </div>
      )}

      <hr />
      <p><a href="/">홈으로 돌아가기</a></p>
    </div>
  )
}
