import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    
    // Parse form data
    const formData = await req.formData()
    const file = formData.get('receipt') as File
    if (!file) {
      return NextResponse.json({ error: 'No receipt file provided' }, { status: 400 })
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    let mimeType = file.type || 'image/jpeg'
    
    // Fallback detection from filename
    if (!file.type && file.name) {
      if (file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png'
      else if (file.name.toLowerCase().endsWith('.webp')) mimeType = 'image/webp'
      else if (file.name.toLowerCase().endsWith('.heic')) mimeType = 'image/heic'
      else if (file.name.toLowerCase().endsWith('.avif')) mimeType = 'image/avif'
    }

    // Validate supported types
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!supportedTypes.includes(mimeType)) {
      if (mimeType === 'image/heic' || file.name?.toLowerCase().endsWith('.heic')) {
        return NextResponse.json({ error: 'HEIC format (iPhone Live Photo) is not supported. Please upload a JPEG or PNG.' }, { status: 400 })
      }
      if (mimeType === 'image/avif' || file.name?.toLowerCase().endsWith('.avif')) {
        return NextResponse.json({ error: 'AVIF format is not supported by the AI model. Please upload a JPEG or PNG.' }, { status: 400 })
      }
      return NextResponse.json({ error: `Unsupported image type: ${mimeType}. Please upload a JPEG, PNG, or WEBP.` }, { status: 400 })
    }
    
    // Check size limit (4MB)
    if (buffer.byteLength > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large. Please upload an image under 4MB.' }, { status: 400 })
    }

    const base64Image = Buffer.from(buffer).toString('base64')
    
    console.log(`[ScanReceipt] Processing file: name=${file.name}, type=${mimeType}, size=${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    const prompt = `
You are an expert receipt parser. Extract the following information from this receipt image and return ONLY a valid JSON object. Do not include any markdown formatting (no \`\`\`json), no explanation, just the raw JSON object.

Schema:
{
  "total": number,
  "tax": number,
  "tip": number,
  "category": string (one of: "food", "transport", "accommodation", "entertainment", "utilities", "other"),
  "items": [
    {
      "name": string,
      "amount": number
    }
  ]
}

Ensure all prices are numbers (e.g. 15.99). If tax or tip is not explicitly found, default to 0.
`

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ]
    });

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error("No response from Groq")
    }

    // Attempt to strip markdown if the model hallucinates it despite instructions
    let jsonStr = responseText.trim()
    if (jsonStr.startsWith('\`\`\`json')) {
       jsonStr = jsonStr.replace(/^\`\`\`json\n?/, '').replace(/\`\`\`$/, '').trim()
    } else if (jsonStr.startsWith('\`\`\`')) {
       jsonStr = jsonStr.replace(/^\`\`\`\n?/, '').replace(/\`\`\`$/, '').trim()
    }

    const parsed = JSON.parse(jsonStr)
    return NextResponse.json({ success: true, data: parsed })

  } catch (error: any) {
    console.error('Scan Receipt API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scan receipt' },
      { status: 500 }
    )
  }
}
