// app/register/page.js
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
    const router = useRouter()
    const [step, setStep] = useState(1) // 1 = กรอก email/pass, 2 = กรอกโปรไฟล์
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Step 1
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Step 2
    const [fullName, setFullName] = useState('')
    const [studentId, setStudentId] = useState('')
    const [year, setYear] = useState('1')
    const [major, setMajor] = useState('')
    const [userId, setUserId] = useState(null)

    async function handleRegister() {
        if (!email || !password || !confirmPassword) {
            setError('กรุณากรอกข้อมูลให้ครบ')
            return
        }
        if (password !== confirmPassword) {
            setError('Password ไม่ตรงกัน')
            return
        }
        if (password.length < 6) {
            setError('Password ต้องมีอย่างน้อย 6 ตัวอักษร')
            return
        }

        setLoading(true)
        setError('')

        const { data, error } = await supabase.auth.signUp({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setUserId(data.user.id)
        setStep(2) // ไปขั้นตอนกรอกโปรไฟล์
        setLoading(false)
    }

    async function handleSaveProfile() {
        if (!fullName.trim() || !studentId.trim() || !major.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบ')
            return
        }

        setLoading(true)
        setError('')

        const { error } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                role: 'student',
                full_name: fullName,
                student_id: studentId,
                year: Number(year),
                major: major
            })

        if (error) {
            setError('เกิดข้อผิดพลาด: ' + error.message)
            setLoading(false)
            return
        }

        router.push('/student')
        setLoading(false)
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: 24 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

                {/* Progress */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: s <= step ? '#6366f1' : '#e5e7eb' }} />
                    ))}
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>
                    {step === 1 ? '🎓 สมัครสมาชิก' : '👤 ข้อมูลส่วนตัว'}
                </h1>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 28px' }}>
                    {step === 1 ? 'ขั้นตอน 1/2 — ตั้งค่า Email และ Password' : 'ขั้นตอน 2/2 — กรอกข้อมูลนักศึกษา'}
                </p>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                        ⚠️ {error}
                    </div>
                )}

                {step === 1 ? (
                    <>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="student@university.ac.th"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                        />

                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                        />

                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>ยืนยัน Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="กรอก Password อีกครั้ง"
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
                        />

                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: loading ? '#9ca3af' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? 'กำลังสมัคร...' : 'ถัดไป →'}
                        </button>
                    </>
                ) : (
                    <>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>ชื่อ-นามสกุล</label>
                        <input
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="เช่น สมชาย ใจดี"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                        />

                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>รหัสนักศึกษา</label>
                        <input
                            value={studentId}
                            onChange={e => setStudentId(e.target.value)}
                            placeholder="เช่น 6512345678"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>ชั้นปี</label>
                                <select
                                    value={year}
                                    onChange={e => setYear(e.target.value)}
                                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>ปี {y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>สาขา</label>
                                <input
                                    value={major}
                                    onChange={e => setMajor(e.target.value)}
                                    placeholder="เช่น วิศวกรรมซอฟต์แวร์"
                                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: loading ? '#9ca3af' : '#111', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? 'กำลังบันทึก...' : 'เริ่มใช้งาน 🎉'}
                        </button>
                    </>
                )}

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
                    มีบัญชีอยู่แล้ว?{' '}
                    <a href="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>เข้าสู่ระบบ</a>
                </p>

            </div>
        </div>
    )
}