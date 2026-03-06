'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudentPage() {
    const router = useRouter()
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedAssignment, setSelectedAssignment] = useState(null)
    const [studentNote, setStudentNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => { checkLoginAndLoad() }, [])

    const [userId, setUserId] = useState(null)

    async function checkLoginAndLoad() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        setUserId(user.id)

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profileData?.role === 'teacher') { router.push('/teacher'); return }
        setProfile(profileData)
        fetchAssignments(user.id)
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    async function fetchAssignments(uid) {
        const currentUserId = uid || userId
        const { data, error } = await supabase
            .from('assignments')
            .select(`*, submissions(id, score, status, student_note, teacher_note, submitted_at)`)
            .eq('submissions.student_id', currentUserId)
            .order('due_date', { ascending: true })

        // ดึงงานที่ยังไม่ส่งด้วย (left join แบบ manual)    
        const { data: allAssignments } = await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true })

        const { data: mySubmissions } = await supabase
            .from('submissions')
            .select('*')
            .eq('student_id', currentUserId)

        const normalized = allAssignments?.map(a => ({
            ...a,
            submissions: mySubmissions?.filter(s => s.assignment_id === a.id)
        }))

        setAssignments(normalized || [])
        setLoading(false)
    }

    function openModal(assignment) {
        setSelectedAssignment(assignment)
        setStudentNote(assignment.submissions?.[0]?.student_note || '')
        setModalOpen(true)
    }

    async function submitWork() {
        if (!studentNote.trim()) { alert('กรุณาเขียนโน๊ตก่อนส่งครับ'); return }
        setSubmitting(true)
        const { error } = await supabase.from('submissions')
            .upsert({
                assignment_id: selectedAssignment.id,
                student_id: userId,
                student_note: studentNote,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            }, { onConflict: 'assignment_id,student_id' })

        if (error) alert('เกิดข้อผิดพลาด: ' + error.message)
        else { setModalOpen(false); setStudentNote(''); fetchAssignments() }
        setSubmitting(false)
    }

    function getStatus(assignment) {
        const sub = assignment.submissions?.[0]
        if (!sub) return { label: 'ยังไม่ส่ง', color: '#6b7280', bg: '#f3f4f6' }
        if (sub.status === 'graded') return { label: 'ตรวจแล้ว', color: '#059669', bg: '#d1fae5' }
        return { label: 'รอตรวจ', color: '#d97706', bg: '#fef3c7' }
    }

    function getCategoryIcon(category) {
        const icons = { lab: '🧪', exam: '📝', quiz: '⚡', attendance: '✅', project: '🚀' }
        return icons[category] || '📌'
    }

    function getGrade(avg) {
        if (avg >= 80) return { grade: 'A', label: 'ดีเยี่ยม', color: '#059669', bg: '#d1fae5' }
        if (avg >= 75) return { grade: 'B+', label: 'ดีมาก', color: '#0891b2', bg: '#e0f2fe' }
        if (avg >= 70) return { grade: 'B', label: 'ดี', color: '#6366f1', bg: '#eef2ff' }
        if (avg >= 65) return { grade: 'C+', label: 'ค่อนข้างดี', color: '#d97706', bg: '#fef3c7' }
        if (avg >= 60) return { grade: 'C', label: 'พอใช้', color: '#ea580c', bg: '#fff7ed' }
        if (avg >= 55) return { grade: 'D+', label: 'อ่อน', color: '#dc2626', bg: '#fee2e2' }
        if (avg >= 50) return { grade: 'D', label: 'อ่อนมาก', color: '#9f1239', bg: '#ffe4e6' }
        return { grade: 'F', label: 'ตก', color: '#ef4444', bg: '#fee2e2' }
    }

    const totalCount = assignments.length
    const submittedCount = assignments.filter(a => a.submissions?.[0]).length
    const gradedCount = assignments.filter(a => a.submissions?.[0]?.status === 'graded').length

    const chartData = assignments
        .filter(a => a.submissions?.[0]?.score != null)
        .map(a => ({
            name: a.title.length > 10 ? a.title.substring(0, 10) + '...' : a.title,
            คะแนน: Math.round((a.submissions[0].score / a.max_score) * 100),
            rawScore: a.submissions[0].score,
            maxScore: a.max_score,
        }))
    const totalMaxScore = assignments.reduce((s, a) => s + a.max_score, 0)
    const totalGotScore = assignments.reduce((s, a) => {
        const score = a.submissions?.[0]?.score
        return s + (score != null ? score : 0)
    }, 0)
    const avg = totalMaxScore > 0
        ? Math.round((totalGotScore / totalMaxScore) * 100)
        : null

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังโหลดข้อมูล...</div>

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 24px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', margin: 0 }}>🎓 Student Dashboard</h1>
                        {profile && (
                            <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
                                {profile.full_name} · รหัส {profile.student_id} · ปี {profile.year} · {profile.major}
                            </p>
                        )}
                    </div>
                    <button onClick={handleLogout} style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#374151', fontWeight: 600, cursor: 'pointer' }}>
                        ออกจากระบบ
                    </button>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    {[
                        { label: 'งานทั้งหมด', value: totalCount, color: '#6366f1' },
                        { label: 'ส่งแล้ว', value: submittedCount, color: '#d97706' },
                        { label: 'ตรวจแล้ว', value: gradedCount, color: '#059669' },
                    ].map(card => (
                        <div key={card.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `4px solid ${card.color}` }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{card.label}</p>
                            <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 800, color: card.color }}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* กราฟคะแนน */}
                {chartData.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>📈 แนวโน้มคะแนน</h2>
                            <div style={{ display: 'flex', gap: 16 }}>
                                {[
                                    { label: 'คะแนนเฉลี่ย', value: avg, color: avg >= 80 ? '#059669' : avg >= 60 ? '#d97706' : '#ef4444' },
                                    { label: 'สูงสุด', value: Math.max(...chartData.map(d => d.คะแนน)), color: '#6366f1' },
                                    { label: 'ต่ำสุด', value: Math.min(...chartData.map(d => d.คะแนน)), color: '#f43f5e' },
                                ].map(s => (
                                    <div key={s.label} style={{ textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{s.label}</p>
                                        <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}
                                    formatter={(value, name, props) => [
                                        `${props.payload.rawScore}/${props.payload.maxScore} (${value}%)`, 'คะแนน'
                                    ]} />
                                <Line type="monotone" dataKey="คะแนน" stroke="#6366f1" strokeWidth={3} dot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>

                        {/* เกรดที่คาดว่าจะได้ */}
                        {avg !== null && (() => {
                            const g = getGrade(avg)
                            return (
                                <div style={{ marginTop: 12, padding: '16px 20px', borderRadius: 12, background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: g.color }}>เกรดที่คาดว่าจะได้</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 13, color: g.color }}>จากคะแนนเฉลี่ย {avg}/100</p>
                                    </div>
                                    <div style={{ background: g.color, borderRadius: 12, padding: '8px 20px', textAlign: 'center' }}>
                                        <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{g.grade}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{g.label}</p>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                )}

                {/* รายการงาน */}
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 16 }}>รายการงานที่มอบหมาย</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {assignments.map(assignment => {
                        const status = getStatus(assignment)
                        const sub = assignment.submissions?.[0]
                        return (
                            <div key={assignment.id} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>
                                            {getCategoryIcon(assignment.category)} {assignment.title}
                                        </h3>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: status.color, background: status.bg, padding: '2px 10px', borderRadius: 20 }}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                                        {assignment.subject} · กำหนดส่ง {new Date(assignment.due_date).toLocaleDateString('th-TH')}
                                    </p>
                                    {assignment.description && (
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>📋 {assignment.description}</p>
                                    )}
                                    {sub?.teacher_note && (
                                        <div style={{ marginTop: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1d4ed8' }}>
                                            💬 อาจารย์: {sub.teacher_note}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>คะแนน</p>
                                        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: sub?.score != null ? '#059669' : '#9ca3af' }}>
                                            {sub?.score != null ? sub.score : '—'}<span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>/{assignment.max_score}</span>
                                        </p>
                                    </div>
                                    <button onClick={() => openModal(assignment)} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                        {sub ? 'ส่งอีกครั้ง' : 'ส่งงาน'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>

            {/* Modal ส่งงาน */}
            {modalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>ส่งงาน</h2>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                        </div>
                        <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>{selectedAssignment?.title}</p>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>โน๊ตถึงอาจารย์</label>
                        <textarea
                            value={studentNote}
                            onChange={e => setStudentNote(e.target.value)}
                            placeholder="อธิบายสิ่งที่ทำ, ปัญหาที่เจอ, หรือสิ่งที่ต้องการให้อาจารย์ทราบ..."
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: 14, fontSize: 14, height: 120, resize: 'none', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', color: '#111' }}
                        />
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '2px solid #e5e7eb', background: 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: 14, color: '#111' }}>
                                ยกเลิก
                            </button>
                            <button onClick={submitWork} disabled={submitting} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: submitting ? '#9ca3af' : '#111', color: '#fff', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                                {submitting ? 'กำลังส่ง...' : 'ยืนยันการส่ง '}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}