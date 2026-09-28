'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  // Auth State
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Leads State
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', company: '', role: '' })
  const [searchTerm, setSearchTerm] = useState('')

  // AI Modal & Direct Email State
  const [selectedLeadForAI, setSelectedLeadForAI] = useState<any>(null)
  const [aiEmailDraft, setAiEmailDraft] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // بررسی وضعیت لاگین Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // دریافت لیست لیدها
  const fetchLeads = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setLeads(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // احراز هویت (ورود / ثبت‌نام)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      })
      if (error) alert('خطا در ورود: ' + error.message)
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      })
      if (error) alert('خطا در ثبت نام: ' + error.message)
      else alert('ثبت نام انجام شد! پیام تایید به ایمیل شما ارسال گردید.')
    }
    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ثبت لید جدید
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const newLead = {
      ...formData,
      status: 'جدید',
      score: Math.floor(Math.random() * 35) + 65
    }

    const { error } = await supabase.from('leads').insert([newLead])

    if (!error) {
      setFormData({ name: '', email: '', company: '', role: '' })
      fetchLeads()
    } else {
      alert('خطا در ثبت لید: ' + error.message)
    }
    setSubmitting(false)
  }

  // حذف لید
  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این لید اطمینان دارید؟')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) {
      fetchLeads()
    } else {
      alert('خطا در حذف: ' + error.message)
    }
  }

  // تغییر وضعیت لید
  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id)
    if (!error) {
      fetchLeads()
    } else {
      alert('خطا در به‌روزرسانی وضعیت: ' + error.message)
    }
  }

  // فراخوانی واقعی API هوش مصنوعی Gemini
  const generateAIEmail = async (lead: any) => {
    setSelectedLeadForAI(lead)
    setGeneratingAI(true)
    setAiEmailDraft('')

    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: lead.name, company: lead.company, role: lead.role })
      })
      const data = await res.json()
      if (data.text) {
        setAiEmailDraft(data.text)
      } else {
        alert('خطا در دریافت متن از Gemini: ' + (data.error || 'پاسخی دریافت نشد'))
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور هوش مصنوعی')
    }
    setGeneratingAI(false)
  }

  // ارسال مستقیم ایمیل با Resend API
  const sendDirectEmail = async () => {
    if (!selectedLeadForAI || !aiEmailDraft) return
    
    if (!confirm(`آیا از ارسال مستقیم ایمیل به ${selectedLeadForAI.email} اطمینان دارید؟`)) return

    setSendingEmail(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedLeadForAI.email,
          subject: `پیشنهاد همکاری اختصاصی برای ${selectedLeadForAI.company}`,
          body: aiEmailDraft
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('🚀 ایمیل با موفقیت به ' + selectedLeadForAI.email + ' ارسال شد!')
        await handleStatusChange(selectedLeadForAI.id, 'در حال پیگیری')
        setSelectedLeadForAI(null)
      } else {
        alert('خطا در ارسال ایمیل: ' + (data.error || 'ناشناخته'))
      }
    } catch (err) {
      alert('خطا در اتصال به سرویس ارسال ایمیل')
    }
    setSendingEmail(false)
  }

  // خروجی گرفتن اکسل / CSV
  const exportToCSV = () => {
    if (leads.length === 0) return alert('هیچ داده‌ای برای دریافت خروجی وجود ندارد.')
    const headers = ['نام', 'ایمیل', 'شرکت', 'سمت', 'امتیاز', 'وضعیت']
    const rows = leads.map(l => [l.name, l.email, l.company, l.role, l.score || 0, l.status || 'جدید'])
    
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '2rem 1.5rem',
      direction: 'rtl'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* هدر اصلی */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '1.25rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚡ LeadEngine AI
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '0.25rem', fontSize: '0.9rem' }}>
              سامانه جامع و هوشمند مدیریت و جذب لیدهای B2B
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={exportToCSV}
              style={{
                backgroundColor: '#059669',
                color: '#fff',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)'
              }}
            >
              📥 خروجی CSV
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1e293b', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>👤 {user.email}</span>
                <button onClick={handleLogout} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>خروج</button>
              </div>
            ) : null}
          </div>
        </header>

        {/* بخش ورود / ثبت‌نام احراز هویت */}
        {!user && (
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>🔐 احراز هویت کاربران (Supabase Auth)</strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>جهت ذخیره اختصاصی اطلاعات، وارد حساب کاربری خود شوید.</p>
            </div>
            <form onSubmit={handleAuth} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="ایمیل"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
              />
              <input
                type="password"
                placeholder="رمز عبور"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" disabled={authLoading} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                {authMode === 'login' ? 'ورود' : 'ثبت نام'}
              </button>
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                {authMode === 'login' ? 'ساخت حساب' : 'ورود'}
              </button>
            </form>
          </div>
        )}

        {/* کارت‌های آمار */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>کل لیدهای ثبت‌شده</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f8fafc', marginTop: '0.5rem' }}>{leads.length}</div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>میانگین امتیاز کیفی (Score)</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#4ade80', marginTop: '0.5rem' }}>
              {leads.length > 0 ? Math.round(leads.reduce((acc, curr) => acc + (curr.score || 0), 0) / leads.length) : 0}%
            </div>
          </div>
          <div style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>لیدهای در حال پیگیری</div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', marginTop: '0.5rem' }}>
              {leads.filter(l => l.status === 'در حال پیگیری').length}
            </div>
          </div>
        </div>

        {/* بخش اصلی */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* فرم افزودن لید */}
          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
              ➕ ثبت لید B2B جدید
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>نام و نام خانوادگی</label>
                <input
                  type="text"
                  placeholder="مثلاً: علی محمدی"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>ایمیل کاری</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>نام شرکت / سازمان</label>
                <input
                  type="text"
                  placeholder="مثلاً: تکنولوژی پارس"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>سمت شغلی</label>
                <input
                  type="text"
                  placeholder="مثلاً: مدیر فروش / VP"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{ marginTop: '0.5rem', padding: '0.85rem', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '600', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                {submitting ? 'در حال ذخیره‌سازی...' : '🚀 ثبت لید در دیتابیس'}
              </button>
            </form>
          </div>

          {/* بانک لیدها و قابلیت‌ها */}
          <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                📋 بانک لیدها ({filteredLeads.length})
              </h2>
              <input
                type="text"
                placeholder="🔍 جستجو..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '0.5rem 0.85rem', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none', minWidth: '200px' }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>در حال بارگذاری...</div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#94a3b8' }}>
                هیچ لیدی ثبت نشده است.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{ backgroundColor: '#0f172a', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '1.05rem' }}>{lead.name}</span>
                          <span style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                            {lead.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          🏢 <strong style={{ color: '#cbd5e1' }}>{lead.company}</strong> &bull; ✉️ {lead.email}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: (lead.score || 0) >= 80 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: (lead.score || 0) >= 80 ? '#4ade80' : '#f59e0b' }}>
                          امتیاز: {lead.score || 0}
                        </span>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>

                    {/* مدیریت وضعیت و تولید ایمیل AI */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px dashed #334155', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>وضعیت:</span>
                        <select
                          value={lead.status || 'جدید'}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          style={{ backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #475569', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.8rem', outline: 'none' }}
                        >
                          <option value="جدید">جدید</option>
                          <option value="در حال پیگیری">در حال پیگیری</option>
                          <option value="جلسه تنظیم شد">جلسه تنظیم شد</option>
                          <option value="بسته شد (موفق)">بسته شد (موفق)</option>
                        </select>
                      </div>

                      <button
                        onClick={() => generateAIEmail(lead)}
                        style={{ backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)' }}
                      >
                        🤖 نگارش ایمیل با AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* مدال / پاپ‌آپ تولید ایمیل AI */}
        {selectedLeadForAI && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '16px', padding: '1.5rem', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🤖 متن ایمیل پیشنهادی برای {selectedLeadForAI.name}
                </h3>
                <button onClick={() => setSelectedLeadForAI(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              {generatingAI ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#cbd5e1' }}>⏳ در حال هوشمندسازی و نگارش متن با Gemini...</div>
              ) : (
                <div>
                  <textarea
                    readOnly
                    value={aiEmailDraft}
                    style={{ width: '100%', height: '220px', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #475569', borderRadius: '8px', padding: '0.85rem', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={sendDirectEmail}
                      disabled={sendingEmail}
                      style={{ backgroundColor: '#059669', color: '#ffffff', fontWeight: '700', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {sendingEmail ? 'در حال ارسال...' : '✉️ ارسال مستقیم ایمیل'}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiEmailDraft)
                        alert('متن ایمیل در حافظه کپی شد!')
                      }}
                      style={{ backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: '700', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      📋 کپی متن
                    </button>
                    <button
                      onClick={() => setSelectedLeadForAI(null)}
                      style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      بستن
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}