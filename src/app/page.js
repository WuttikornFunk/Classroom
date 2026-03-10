'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkLogin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single()
        router.push(profile?.role === 'teacher' ? '/teacher' : '/student')
      }
    }
    checkLogin()
  }, [])

  async function demoLogin(role) {
    setLoading(true)
    const email = role === 'student' ? 'guest@demo.com' : 'guestteacher@demo.com'
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'demo1234'
    })
    if (!error) router.push(role === 'student' ? '/student' : '/teacher')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 8 }}>
          🎓 Student Performance Tracking
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 40 }}>
          คุณคือใคร?
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <button onClick={() => demoLogin('student')} disabled={loading}
            style={{
              background: '#fff', border: '2px solid #6366f1', borderRadius: 16,
              padding: '24px 16px', cursor: 'pointer', transition: 'all 0.2s'
            }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1' }}>นักศึกษา</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>ดูงาน, ส่งงาน, เช็คเกรด</div>
          </button>

          <button onClick={() => demoLogin('teacher')} disabled={loading}
            style={{
              background: '#fff', border: '2px solid #059669', borderRadius: 16,
              padding: '24px 16px', cursor: 'pointer', transition: 'all 0.2s'
            }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🏫</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>อาจารย์</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>เพิ่มงาน, ให้คะแนน, ดูภาพรวม</div>
          </button>
        </div>

        {loading && <p style={{ marginTop: 20, color: '#6b7280', fontSize: 13 }}>กำลังโหลด...</p>}

        <p style={{ marginTop: 32, fontSize: 12, color: '#9ca3af' }}>
          หรือ <span onClick={() => router.push('/login')}
            style={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>
            เข้าสู่ระบบด้วยบัญชีตัวเอง
          </span>
        </p>
      </div>
    </div>
  )
}