import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { name, company, role } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'کلید GEMINI_API_KEY در فایل env تنظیم نشده است.' }, { status: 500 })
    }

    const prompt = `تو یک کارشناس حرفه‌ای توسعه بازار B2B هستی. یک ایمیل پیشنهادی جذاب، کوتاه، کاملاً محترمانه و شخصی‌سازی‌شده برای فرد زیر بنویس:
نام: ${name}
سمت: ${role}
شرکت: ${company}

هدف ایمیل: معرفی سامانه LeadEngine AI جهت خودکارسازی جذب لید B2B و درخواست یک جلسه ۱۰ دقیقه‌ای آنلاین.
خروجی فقط شامل عنوان ایمیل و متن اصلی باشد و فرمت خوانایی داشته باشد.`

    // مدل‌های به‌روز گوگل Gemini
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash']

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        )

        const data = await response.json()

        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return NextResponse.json({ text: data.candidates[0].content.parts[0].text })
        }
      } catch (err) {
        // در صورت عدم پاسخ‌دهی یک مدل، مدل بعدی تست می‌شود
      }
    }

    // متن پشتیبان استاندارد جهت جلوگیری از توقف برنامه در صورت اختلال شبکه
    const fallbackText = `موضوع: پیشنهاد همکاری اختصاصی B2B برای مجموعه ${company}

درود جناب/سرکار ${name} عزیز،

امیدوارم روز خوبی داشته باشید.

با توجه به نقش کلیدی شما به عنوان ${role} در شرکت ${company}، مایل بودم راهکار اختصاصی LeadEngine AI را خدمتتان معرفی کنم.

سامانه ما به مجموعه‌های پیشرو کمک می‌کند تا روند شناسایی و جذب لیدهای B2B را تا ۳ برابر سریع‌تر و با هوشمندی بالاتر اجرا نمایند.

خوشحال می‌شوم در صورت تمایل، یک گفتگو کوتاه ۱۰ دقیقه‌ای برای بررسی زمینه‌های همکاری مشترک داشته باشیم.

با احترام،
تیم توسعه LeadEngine AI`

    return NextResponse.json({ text: fallbackText })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}