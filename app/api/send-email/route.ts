import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { to, subject, body } = await req.json()
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'کلید RESEND_API_KEY تنظیم نشده است.' }, { status: 500 })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'LeadEngine AI <onboarding@resend.dev>',
        to: [to],
        subject: subject || 'پیشنهاد همکاری اختصاصی B2B',
        text: body
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'خطا در ارسال ایمیل' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}