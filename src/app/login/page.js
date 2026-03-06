// app/login/page.js
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleLogin() {
        if (!email || !password) {
            setError('กรุณากรอก Email และ Password')
            return
        }

        setLoading(true)
        setError('')

        // Step 1: Login ด้วย Supabase Auth
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (loginError) {
            setError('Email หรือ Password ไม่ถูกต้อง')
            setLoading(false)
            return
        }

        // Step 2: ดึง role จาก profiles ว่าเป็นนักศึกษาหรืออาจารย์
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()

        // Step 3: Redirect ตาม role
        if (profile?.role === 'teacher') {
            router.push('/teacher')
        } else {
            router.push('/student')
        }

        setLoading(false)
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
                    🎓 เข้าสู่ระบบ
                </h1>
                <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px' }}>
                    Student Performance Tracking
                </p>

                {/* แสดง error ถ้ามี */}
                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                        ⚠️ {error}
                    </div>
                )}

                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="student@test.com"
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                />

                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
                />

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: loading ? '#9ca3af' : '#111', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
                    ยังไม่มีบัญชี?{' '}
                    <a href="/register" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>สมัครสมาชิก</a>
                </p>

            </div>
        </div>
    )
}