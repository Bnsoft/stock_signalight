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
      
      {status === 'loading' && <p>⏳ Checking connection...</p>}
      
      {status === 'success' && (
        <div style={{ color: 'green' }}>
          <p>✅ Connection Successful!</p>
          <p>Fetched {data.length} records from database.</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      {status === 'error' && (
        <div style={{ color: 'red' }}>
          <p>❌ Connection Failed</p>
          <p>Error: {errorMsg}</p>
          <p>Please double-check your Vercel Environment Variables (NEXT_PUBLIC_...).</p>
        </div>
      )}

      <hr />
      <p><a href="/">Back to Home</a></p>
    </div>
  )
}
