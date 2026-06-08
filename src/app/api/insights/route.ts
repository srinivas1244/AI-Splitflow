import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch user's profile
    const { data: profile } = await supabase.from('profiles').select('full_name, split_id').eq('id', user.id).single()

    // Fetch user's splits (things they owe or are owed for)
    const { data: splits } = await supabase
      .from('expense_splits')
      .select('*, expense:expenses(*, payer:profiles!expenses_paid_by_fkey(full_name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    // Fallback deterministic logic if Groq fails or no key
    const generateFallback = () => {
      const insights = [
        "You're actively splitting expenses!",
        "Keep tracking to see detailed spending trends.",
        "Settle up regularly to keep balances clear."
      ]
      
      if (!splits || splits.length === 0) return insights
      
      let totalSpent = 0
      const categories: Record<string, number> = {}
      
      splits.forEach((s: any) => {
        if (s.expense) {
          totalSpent += s.amount
          categories[s.expense.category || 'other'] = (categories[s.expense.category || 'other'] || 0) + s.amount
        }
      })
      
      const topCat = Object.entries(categories).sort((a,b) => b[1] - a[1])[0]
      
      return [
        `You've shared ₹${totalSpent.toFixed(2)} in total expenses recently.`,
        topCat ? `Your top spending category is ${topCat[0]} (₹${topCat[1].toFixed(2)}).` : "Add more expenses to see category trends.",
        "You're doing great keeping your finances organized!"
      ]
    }

    // Try to use Groq
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ insights: generateFallback() })
    }

    // Prepare minified JSON for Groq to save tokens and speed up
    const summaryData = (splits || []).map((s: any) => {
      if (!s.expense) return null
      return {
        date: s.expense.date,
        amount: s.amount,
        title: s.expense.title,
        cat: s.expense.category,
        payer: s.expense.payer?.full_name,
        type: s.expense.split_type
      }
    }).filter(Boolean)

    if (summaryData.length === 0) {
      return NextResponse.json({ insights: ["You don't have any expenses yet. Start adding some to see AI insights!"] })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const prompt = `
You are an expert financial AI assistant inside the "SplitFlow" expense splitting app.
Analyze the user's recent expense splits provided below and generate exactly 3 short, punchy, and highly personalized financial insights.
The user's name is ${profile?.full_name}.

Rules:
1. Make them sound smart, analytical, and friendly.
2. Mention specific categories, amounts, or friends if relevant.
3. Keep each insight under 12 words.
4. Return ONLY a valid JSON array of exactly 3 strings. No markdown, no intro.

Expense Data JSON:
${JSON.stringify(summaryData.slice(0, 30))}
`
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 200,
    })

    const content = completion.choices[0]?.message?.content || ""
    
    // Strip markdown if present
    let jsonStr = content.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/```$/, '').trim()
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\n?/, '').replace(/```$/, '').trim()

    let insights = JSON.parse(jsonStr)
    if (!Array.isArray(insights)) throw new Error("Invalid output format")

    return NextResponse.json({ insights })

  } catch (error) {
    console.error("AI Insights Error:", error)
    // Return deterministic fallback if AI fails
    return NextResponse.json({ 
      insights: [
        "Your spending is being tracked properly.", 
        "Check your groups to settle pending balances.",
        "We couldn't generate deep insights right now."
      ] 
    })
  }
}
