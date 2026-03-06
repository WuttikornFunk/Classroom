// app/teacher/page.js
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TeacherPage() {
    const router = useRouter()
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [activeTab, setActiveTab] = useState('assignments') // 'assignments' | 'students'

    // Grading modal
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedAssignment, setSelectedAssignment] = useState(null)
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [score, setScore] = useState('')
    const [teacherNote, setTeacherNote] = useState('')
    const [saving, setSaving] = useState(false)

    // Add assignment modal
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [newSubject, setNewSubject] = useState('Web Programming')
    const [newCategory, setNewCategory] = useState('lab')
    const [newMaxScore, setNewMaxScore] = useState(100)
    const [newDueDate, setNewDueDate] = useState('')
    const [adding, setAdding] = useState(false)

    // Student detail modal
    const [studentModalOpen, setStudentModalOpen] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)

    useEffect(() => { checkLoginAndLoad() }, [])

    async function checkLoginAndLoad() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profileData?.role !== 'teacher') { router.push('/student'); return }
        setProfile(profileData)
        fetchAssignments()
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    async function fetchAssignments() {
        const { data: allAssignments } = await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true })

        const { data: allSubmissions } = await supabase
            .from('submissions')
            .select(`*, profiles(id, full_name, student_id, year, major)`)

        const normalized = allAssignments?.map(a => ({
            ...a,
            submissions: allSubmissions?.filter(s => s.assignment_id === a.id) || []
        }))

        setAssignments(normalized || [])
        setLoading(false)
    }

    // ---- Derived: per-student summary ----
    const studentMap = {}
    assignments.forEach(a => {
        a.submissions.forEach(sub => {
            const sid = sub.student_id
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    id: sid,
                    profile: sub.profiles,
                    submissions: [],
                }
            }
            studentMap[sid].submissions.push({ ...sub, assignment: a })
        })
    })
    const students = Object.values(studentMap)

    function calcStudentStats(studentSubs) {
        const graded = studentSubs.filter(s => s.score != null)
        const totalMax = assignments.reduce((s, a) => s + a.max_score, 0)
        const totalScore = graded.reduce((s, sub) => s + sub.score, 0)
        const avg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null
        return { avg, totalScore, totalMax, gradedCount: graded.length, submittedCount: studentSubs.length }
    }

    // ---- Helpers ----
    function getGrade(avg) {
        if (avg === null) return { grade: '—', color: '#6b7280', bg: '#f3f4f6' }
        if (avg >= 80) return { grade: 'A', color: '#059669', bg: '#d1fae5' }
        if (avg >= 75) return { grade: 'B+', color: '#0891b2', bg: '#e0f2fe' }
        if (avg >= 70) return { grade: 'B', color: '#6366f1', bg: '#eef2ff' }
        if (avg >= 65) return { grade: 'C+', color: '#d97706', bg: '#fef3c7' }
        if (avg >= 60) return { grade: 'C', color: '#ea580c', bg: '#fff7ed' }
        if (avg >= 55) return { grade: 'D+', color: '#dc2626', bg: '#fee2e2' }
        if (avg >= 50) return { grade: 'D', color: '#9f1239', bg: '#ffe4e6' }
        return { grade: 'F', label: 'ตก', color: '#ef4444', bg: '#fee2e2' }
    }

    function getCategoryIcon(category) {
        const icons = { lab: '🧪', exam: '📝', quiz: '⚡', attendance: '✅', project: '🚀' }
        return icons[category] || '📌'
    }

    function openModal(assignment, submission) {
        setSelectedAssignment(assignment)
        setSelectedSubmission(submission)
        setScore(submission?.score ?? '')
        setTeacherNote(submission?.teacher_note || '')
        setModalOpen(true)
    }

    async function saveGrade() {
        if (score === '') { alert('กรุณาใส่คะแนนก่อนครับ'); return }
        if (Number(score) < 0 || Number(score) > selectedAssignment.max_score) {
            alert(`คะแนนต้องอยู่ระหว่าง 0 - ${selectedAssignment.max_score}`); return
        }
        setSaving(true)
        const { error } = await supabase.from('submissions').upsert({
            assignment_id: selectedAssignment.id,
            student_id: selectedSubmission.student_id,
            score: Number(score),
            teacher_note: teacherNote,
            status: 'graded',
            graded_at: new Date().toISOString()
        }, { onConflict: 'assignment_id,student_id' })

        if (error) alert('เกิดข้อผิดพลาด: ' + error.message)
        else { setModalOpen(false); fetchAssignments() }
        setSaving(false)
    }

    async function addAssignment() {
        if (!newTitle.trim() || !newDueDate) { alert('กรุณากรอกชื่องานและวันกำหนดส่งครับ'); return }
        setAdding(true)
        const { error } = await supabase.from('assignments').insert({
            title: newTitle, description: newDescription,
            subject: newSubject, category: newCategory,
            max_score: newMaxScore, due_date: newDueDate
        })
        if (error) { alert('เกิดข้อผิดพลาด: ' + error.message) }
        else {
            setNewTitle(''); setNewDescription(''); setNewSubject('Web Programming')
            setNewCategory('lab'); setNewMaxScore(100); setNewDueDate('')
            setAddModalOpen(false); fetchAssignments()
        }
        setAdding(false)
    }

    async function deleteAssignment(assignmentId) {
        if (!window.confirm('ต้องการลบงานนี้ใช่ไหมครับ?')) return
        const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
        if (error) alert('เกิดข้อผิดพลาด: ' + error.message)
        else fetchAssignments()
    }

    const totalCount = assignments.length
    const submittedCount = assignments.reduce((n, a) => n + a.submissions.filter(s => s.status === 'submitted').length, 0)
    const gradedCount = assignments.reduce((n, a) => n + a.submissions.filter(s => s.status === 'graded').length, 0)

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังโหลดข้อมูล...</div>

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 24px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', margin: 0 }}>👨‍🏫 Teacher Dashboard</h1>
                        {profile && <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>{profile.full_name}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setAddModalOpen(true)}
                            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            + เพิ่มงานใหม่
                        </button>
                        <button onClick={handleLogout}
                            style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#374151', fontWeight: 600, cursor: 'pointer' }}>
                            ออกจากระบบ
                        </button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                    {[
                        { label: 'งานทั้งหมด', value: totalCount, color: '#6366f1' },
                        { label: 'รอตรวจ', value: submittedCount, color: '#d97706' },
                        { label: 'ตรวจแล้ว', value: gradedCount, color: '#059669' },
                    ].map(card => (
                        <div key={card.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderTop: `4px solid ${card.color}` }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{card.label}</p>
                            <p style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 800, color: card.color }}>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#e5e7eb', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                    {[
                        { key: 'assignments', label: '📋 รายการงาน' },
                        { key: 'students', label: '👥 คะแนนนักศึกษา' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: 700,
                            background: activeTab === tab.key ? '#fff' : 'transparent',
                            color: activeTab === tab.key ? '#111' : '#6b7280',
                            boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                        }}>{tab.label}</button>
                    ))}
                </div>

                {/* ===== TAB: ASSIGNMENTS ===== */}
                {activeTab === 'assignments' && (
                    <>
                        {submittedCount > 0 && (
                            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
                                🔔 มีงานรอตรวจ <strong>{submittedCount} ชิ้น</strong> กรุณาตรวจโดยเร็ว
                            </div>
                        )}
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 14 }}>รายการงานทั้งหมด</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {assignments.map(assignment => (
                                <div key={assignment.id} style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>
                                            {getCategoryIcon(assignment.category)} {assignment.title}
                                        </h3>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                                            {assignment.subject} · {new Date(assignment.due_date).toLocaleDateString('th-TH')}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
                                            (เต็ม {assignment.max_score} คะแนน)
                                        </span>
                                        <button onClick={() => deleteAssignment(assignment.id)}
                                            style={{ marginLeft: 'auto', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}>
                                            🗑️
                                        </button>
                                    </div>
                                    {assignment.submissions.length === 0 ? (
                                        <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>ยังไม่มีนักศึกษาส่งงาน</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {assignment.submissions.map(sub => {
                                                const needsGrading = sub.status === 'submitted'
                                                const pct = sub.score != null ? Math.round((sub.score / assignment.max_score) * 100) : null
                                                const g = getGrade(pct)
                                                return (
                                                    <div key={sub.id} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '12px 16px',
                                                        background: needsGrading ? '#fffbeb' : '#f8fafc',
                                                        borderRadius: 10,
                                                        border: needsGrading ? '1px solid #fcd34d' : '1px solid #e5e7eb'
                                                    }}>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111' }}>
                                                                {sub.profiles?.full_name || 'ไม่ทราบชื่อ'}
                                                                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                                                                    รหัส {sub.profiles?.student_id} · ปี {sub.profiles?.year}
                                                                </span>
                                                            </p>
                                                            {sub.student_note && (
                                                                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>📩 นักศึกษา: {sub.student_note}</p>
                                                            )}
                                                            {sub.teacher_note && (
                                                                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#059669' }}>💬 อาจารย์: {sub.teacher_note}</p>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

                                                            <div style={{ textAlign: 'right' }}>
                                                                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>คะแนน</p>
                                                                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: sub.score != null ? '#059669' : '#9ca3af' }}>
                                                                    {sub.score != null ? sub.score : '—'}<span style={{ fontSize: 12, color: '#9ca3af' }}>/{assignment.max_score}</span>
                                                                </p>
                                                            </div>
                                                            <button onClick={() => openModal(assignment, sub)}
                                                                style={{ background: needsGrading ? '#f59e0b' : '#111', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                                {needsGrading ? 'ให้คะแนน 📝' : 'แก้คะแนน'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ===== TAB: STUDENTS ===== */}
                {activeTab === 'students' && (
                    <>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 6 }}>คะแนนรวมนักศึกษา</h2>
                        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                            คลิกที่นักศึกษาเพื่อดูรายละเอียดคะแนนแต่ละงาน
                        </p>

                        {students.length === 0 ? (
                            <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                ยังไม่มีนักศึกษาส่งงาน
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {students
                                    .map(st => ({ ...st, stats: calcStudentStats(st.submissions) }))
                                    .sort((a, b) => (b.stats.avg ?? -1) - (a.stats.avg ?? -1))
                                    .map((st, rank) => {
                                        const { avg, totalScore, totalMax, gradedCount, submittedCount } = st.stats
                                        const g = getGrade(avg)
                                        return (
                                            <div key={st.id}
                                                onClick={() => { setSelectedStudent(st); setStudentModalOpen(true) }}
                                                style={{
                                                    background: '#fff', borderRadius: 14, padding: '16px 20px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                    cursor: 'pointer', transition: 'box-shadow 0.15s',
                                                    border: '1px solid #f3f4f6',
                                                    display: 'flex', alignItems: 'center', gap: 16,
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                                                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
                                            >
                                                {/* Rank */}
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: rank === 0 ? '#fef3c7' : rank === 1 ? '#f3f4f6' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: rank === 0 ? '#d97706' : '#9ca3af', flexShrink: 0 }}>
                                                    {rank + 1}
                                                </div>

                                                {/* Name + info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>
                                                        {st.profile?.full_name || 'ไม่ทราบชื่อ'}
                                                    </p>
                                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                                                        รหัส {st.profile?.student_id} · ปี {st.profile?.year} · {st.profile?.major}
                                                    </p>
                                                    {/* Progress bar */}
                                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 99 }}>
                                                            <div style={{ width: `${avg ?? 0}%`, height: '100%', background: g.color, borderRadius: 99, transition: 'width 0.5s' }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                                            {gradedCount} งานที่ตรวจแล้ว / {assignments.length} งานทั้งหมด
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Score summary */}
                                                <div style={{ textAlign: 'center', minWidth: 80 }}>
                                                    <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>คะแนนรวม</p>
                                                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: avg !== null ? g.color : '#9ca3af' }}>
                                                        {avg !== null ? `${totalScore}/${totalMax}` : '—'}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                                                        {avg !== null ? `${avg}%` : ''}
                                                    </p>
                                                </div>

                                                {/* Grade badge */}
                                                <div style={{ background: g.bg, borderRadius: 12, padding: '10px 18px', textAlign: 'center', flexShrink: 0 }}>
                                                    <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: g.color, lineHeight: 1 }}>{g.grade}</p>
                                                    <p style={{ margin: '2px 0 0', fontSize: 10, color: g.color, fontWeight: 600 }}>{g.label}</p>
                                                </div>

                                                <span style={{ fontSize: 18, color: '#d1d5db' }}>›</span>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </>
                )}

            </div>

            {/* ===== MODAL: Grade ===== */}
            {modalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>ให้คะแนน</h2>
                            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                        </div>
                        <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: 14 }}>{selectedAssignment?.title}</p>
                        <p style={{ margin: '0 0 20px', color: '#374151', fontSize: 13, fontWeight: 600 }}>
                            นักศึกษา: {selectedSubmission?.profiles?.full_name}
                        </p>
                        {selectedSubmission?.student_note && (
                            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1d4ed8' }}>
                                📩 โน๊ตจากนักศึกษา: {selectedSubmission.student_note}
                            </div>
                        )}
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                            คะแนน (เต็ม {selectedAssignment?.max_score})
                        </label>
                        <input type="number" min={0} max={selectedAssignment?.max_score}
                            value={score} onChange={e => setScore(e.target.value)} placeholder="0"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', fontSize: 20, fontWeight: 700, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Feedback ให้นักศึกษา</label>
                        <textarea value={teacherNote} onChange={e => setTeacherNote(e.target.value)}
                            placeholder="ข้อดี, จุดที่ควรพัฒนา, คำแนะนำ..."
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: 14, fontSize: 14, height: 100, resize: 'none', outline: 'none', fontFamily: 'sans-serif', boxSizing: 'border-box', color: '#111' }} />
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button onClick={() => setModalOpen(false)}
                                style={{ flex: 1, padding: 12, borderRadius: 12, border: '2px solid #e5e7eb', background: 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: 14, color: '#111' }}>
                                ยกเลิก
                            </button>
                            <button onClick={saveGrade} disabled={saving}
                                style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: saving ? '#9ca3af' : '#111', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                                {saving ? 'กำลังบันทึก...' : 'บันทึกคะแนน ✅'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL: Student Detail ===== */}
            {studentModalOpen && selectedStudent && (() => {
                const { stats } = selectedStudent
                const g = getGrade(stats.avg)
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}>
                        <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111' }}>
                                        {selectedStudent.profile?.full_name}
                                    </h2>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                                        รหัส {selectedStudent.profile?.student_id} · ปี {selectedStudent.profile?.year} · {selectedStudent.profile?.major}
                                    </p>
                                </div>
                                <button onClick={() => setStudentModalOpen(false)}
                                    style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                            </div>

                            {/* Overall grade card */}
                            <div style={{ background: g.bg, borderRadius: 16, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: g.color }}>ภาพรวมผลการเรียน</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: g.color }}>
                                        คะแนนรวม {stats.totalScore}/{stats.totalMax} ({stats.avg ?? '—'}%)
                                        · ตรวจแล้ว {stats.gradedCount}/{assignments.length} งาน
                                    </p>
                                    <div style={{ marginTop: 10, width: 200, height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 99 }}>
                                        <div style={{ width: `${stats.avg ?? 0}%`, height: '100%', background: g.color, borderRadius: 99 }} />
                                    </div>
                                </div>
                                <div style={{ background: g.color, borderRadius: 14, padding: '12px 24px', textAlign: 'center' }}>
                                    <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{g.grade}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{g.label}</p>
                                </div>
                            </div>

                            {/* Assignment breakdown */}
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 12 }}>รายละเอียดคะแนนแต่ละงาน</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {assignments.map(a => {
                                    const sub = selectedStudent.submissions.find(s => s.assignment_id === a.id)
                                    const pct = sub?.score != null ? Math.round((sub.score / a.max_score) * 100) : null
                                    const ag = getGrade(pct)
                                    const statusLabel = !sub ? 'ยังไม่ส่ง' : sub.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ'
                                    const statusColor = !sub ? '#6b7280' : sub.status === 'graded' ? '#059669' : '#d97706'
                                    return (
                                        <div key={a.id} style={{ borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', background: '#fafafa' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                                                            {getCategoryIcon(a.category)} {a.title}
                                                        </span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusColor + '18', padding: '2px 8px', borderRadius: 20 }}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                                                        {a.subject} · กำหนดส่ง {new Date(a.due_date).toLocaleDateString('th-TH')}
                                                    </p>
                                                    {sub?.student_note && (
                                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280', background: '#eff6ff', padding: '6px 10px', borderRadius: 8 }}>
                                                            📩 นักศึกษา: {sub.student_note}
                                                        </p>
                                                    )}
                                                    {sub?.teacher_note && (
                                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#059669', background: '#f0fdf4', padding: '6px 10px', borderRadius: 8 }}>
                                                            💬 อาจารย์: {sub.teacher_note}
                                                        </p>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12, flexShrink: 0 }}>
                                                    {pct !== null && (
                                                        <div style={{ background: ag.bg, borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
                                                            <span style={{ fontSize: 15, fontWeight: 900, color: ag.color }}>{ag.grade}</span>
                                                        </div>
                                                    )}
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>คะแนน</p>
                                                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: sub?.score != null ? ag.color : '#9ca3af' }}>
                                                            {sub?.score != null ? sub.score : '—'}
                                                            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>/{a.max_score}</span>
                                                        </p>
                                                    </div>
                                                    {sub && (
                                                        <button onClick={() => { setStudentModalOpen(false); openModal(a, sub) }}
                                                            style={{ background: sub.status === 'submitted' ? '#f59e0b' : '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                            {sub.status === 'submitted' ? 'ให้คะแนน' : 'แก้คะแนน'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Score bar */}
                                            {pct !== null && (
                                                <div style={{ marginTop: 10, height: 5, background: '#e5e7eb', borderRadius: 99 }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: ag.color, borderRadius: 99, transition: 'width 0.5s' }} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ===== MODAL: Add Assignment ===== */}
            {addModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>+ เพิ่มงานใหม่</h2>
                            <button onClick={() => setAddModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>ชื่องาน *</label>
                        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="เช่น Lab 5: Node.js Basics"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>คำอธิบาย</label>
                        <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="รายละเอียดงาน..."
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', height: 80, resize: 'none', fontFamily: 'sans-serif', marginBottom: 16 }} />
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>วิชา</label>
                        <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Web Programming"
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>ประเภท</label>
                                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }}>
                                    <option value="lab">Lab</option>
                                    <option value="exam">Exam</option>
                                    <option value="quiz">Quiz</option>
                                    <option value="project">Project</option>
                                    <option value="attendance">Attendance</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>คะแนนเต็ม</label>
                                <input type="number" value={newMaxScore} onChange={e => setNewMaxScore(Number(e.target.value))}
                                    style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>วันกำหนดส่ง *</label>
                        <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', marginBottom: 24 }} />
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => setAddModalOpen(false)}
                                style={{ flex: 1, padding: 12, borderRadius: 12, border: '2px solid #e5e7eb', background: 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: 14, color: '#111' }}>
                                ยกเลิก
                            </button>
                            <button onClick={addAssignment} disabled={adding}
                                style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: adding ? '#9ca3af' : '#6366f1', color: '#fff', fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                                {adding ? 'กำลังบันทึก...' : 'บันทึกงาน ✅'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}