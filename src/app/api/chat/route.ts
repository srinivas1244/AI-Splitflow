import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await req.json()

    // ── Fetch user context from Supabase ──────────────────────────────────
    const [
      { data: profile },
      { data: splits },
      { data: paidExpenses },
      { data: groupMemberships },
      { data: friends },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),

      supabase
        .from('expense_splits')
        .select(`*, expense:expenses(*, payer:profiles!expenses_paid_by_fkey(id, full_name))`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),

      supabase
        .from('expenses')
        .select('*, splits:expense_splits(*)')
        .eq('paid_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20),

      supabase
        .from('group_members')
        .select('*, group:groups(*)')
        .eq('user_id', user.id),

      supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(id, full_name),
          addressee:profiles!friendships_addressee_id_fkey(id, full_name)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
    ])

    // ── Calculate balances ────────────────────────────────────────────────
    let totalOwed = 0
    let totalOwedToMe = 0

    // amounts the user owes others
    splits?.forEach((split: { is_settled: boolean; expense: { paid_by: string } | null; amount: number; user_id: string }) => {
      if (!split.is_settled && split.expense && split.expense.paid_by !== user.id) {
        totalOwed += split.amount
      }
    })

    // amounts others owe the user
    paidExpenses?.forEach((exp: { splits: Array<{ user_id: string; is_settled: boolean; amount: number }> }) => {
      exp.splits?.forEach((s) => {
        if (s.user_id !== user.id && !s.is_settled) {
          totalOwedToMe += s.amount
        }
      })
    })

    // Per-person breakdown of what the user owes
    const owedByPerson: Record<string, { name: string; amount: number }> = {}
    splits?.forEach((split: {
      is_settled: boolean;
      expense: { paid_by: string; payer: { id: string; full_name: string } | null } | null;
      amount: number;
      user_id: string
    }) => {
      if (!split.is_settled && split.expense && split.expense.paid_by !== user.id && split.expense.payer) {
        const payerId = split.expense.paid_by
        const payerName = split.expense.payer.full_name || 'Unknown'
        if (!owedByPerson[payerId]) owedByPerson[payerId] = { name: payerName, amount: 0 }
        owedByPerson[payerId].amount += split.amount
      }
    })

    // Per-person breakdown of who owes the user
    const owingByPerson: Record<string, { name: string; amount: number }> = {}
    paidExpenses?.forEach((exp: {
      id: string;
      title: string;
      amount: number;
      splits: Array<{ user_id: string; is_settled: boolean; amount: number }>;
    }) => {
      // Note: To get profile names we'd need a join; simplified here
      exp.splits?.forEach((s) => {
        if (s.user_id !== user.id && !s.is_settled) {
          if (!owingByPerson[s.user_id]) owingByPerson[s.user_id] = { name: `Member (${s.user_id.slice(0, 6)})`, amount: 0 }
          owingByPerson[s.user_id].amount += s.amount
        }
      })
    })

    // Groups
    const groups = groupMemberships?.map((m: { group: { id: string; name: string } }) => m.group.name) ?? []

    // Friends list
    const friendNames = friends?.map((f: {
      requester_id: string;
      requester: { full_name: string | null } | null;
      addressee: { full_name: string | null } | null;
    }) => {
      const friend = f.requester_id === user.id ? f.addressee : f.requester
      return friend?.full_name || 'Unknown'
    }) ?? []

    // Recent expenses
    const recentExpenses = splits?.slice(0, 10).map((s: {
      expense: {
        title: string;
        amount: number;
        date: string;
        category: string;
        payer: { full_name: string | null } | null;
        paid_by: string;
      } | null;
      amount: number;
      is_settled: boolean;
    }) => ({
      title: s.expense?.title,
      amount: s.expense?.amount,
      myShare: s.amount,
      date: s.expense?.date,
      category: s.expense?.category,
      paidByMe: s.expense?.paid_by === user.id,
      paidBy: s.expense?.payer?.full_name,
      settled: s.is_settled,
    })) ?? []

    // ── Build system prompt ───────────────────────────────────────────────
    const systemPrompt = `You are SplitFlow AI, a friendly and smart financial assistant embedded in SplitFlow — an expense splitting app. 

You help users understand their finances, track expenses, and manage splits with friends and groups.

## Current User Context

**User:** ${profile?.full_name || user.email}

**Financial Summary:**
- Net Balance: ₹${(totalOwedToMe - totalOwed).toFixed(2)} (${totalOwedToMe - totalOwed >= 0 ? 'positive' : 'negative'})
- You owe others: ₹${totalOwed.toFixed(2)}  
- Others owe you: ₹${totalOwedToMe.toFixed(2)}

**What you owe (by person):**
${Object.values(owedByPerson).length > 0
  ? Object.values(owedByPerson).map(p => `- ${p.name}: ₹${p.amount.toFixed(2)}`).join('\n')
  : '- Nothing! You\'re all settled up.'}

**What others owe you:**
${Object.values(owingByPerson).length > 0
  ? Object.values(owingByPerson).map(p => `- User ${p.name}: ₹${p.amount.toFixed(2)}`).join('\n')
  : '- No one owes you right now.'}

**Your Groups:** ${groups.length > 0 ? groups.join(', ') : 'No groups yet'}

**Friends:** ${friendNames.length > 0 ? friendNames.join(', ') : 'No friends added yet'}

**Recent Expenses (last 10):**
${recentExpenses.map((e: {
  title: string | undefined;
  amount: number | undefined;
  myShare: number;
  date: string | undefined;
  category: string | undefined;
  paidByMe: boolean;
  paidBy: string | null | undefined;
  settled: boolean;
}) => `- ${e.title} | ₹${e.amount} | Your share: ₹${e.myShare} | ${e.paidByMe ? 'You paid' : `Paid by ${e.paidBy}`} | ${e.category} | ${e.settled ? 'Settled' : 'Unsettled'} | ${e.date}`).join('\n')}

## Guidelines
- Be concise and friendly
- Use ₹ for currency (Indian Rupees)  
- Give specific, actionable advice based on the real data above
- If asked for settlement suggestions, recommend paying the largest debts first
- Don't make up data — only reference what's in the context above
- Format responses clearly with bullet points or lists when appropriate`

    // ── Call Groq with streaming ───────────────────────────────────────────
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'create_expense',
          description: 'Creates a new expense. Use this when the user asks to add, create, or log an expense.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The title or description of the expense.' },
              amount: { type: 'number', description: 'The total amount of the expense.' },
              category: { type: 'string', enum: ['food', 'transport', 'accommodation', 'entertainment', 'utilities', 'other'] }
            },
            required: ['title', 'amount']
          }
        }
      }
    ];

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      tools: tools,
      tool_choice: "auto",
      max_tokens: 1024,
      stream: true,
    })

    // Stream the response back
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let toolCallName = ''
          let toolCallArgs = ''
          let isToolCall = false

          for await (const chunk of chatCompletion) {
            const toolCalls = chunk.choices[0]?.delta?.tool_calls
            if (toolCalls && toolCalls.length > 0) {
              isToolCall = true
              if (toolCalls[0].function?.name) toolCallName += toolCalls[0].function.name
              if (toolCalls[0].function?.arguments) toolCallArgs += toolCalls[0].function.arguments
            }

            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }

          if (isToolCall && toolCallName === 'create_expense') {
             controller.enqueue(encoder.encode(`\n\n__ACTION_REQUIRED__: create_expense:${toolCallArgs}`))
          }

          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
