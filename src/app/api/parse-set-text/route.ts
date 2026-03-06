import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const XAI_MODEL = 'grok-3-fast'

const SYSTEM_PROMPT = `Sos un asistente que extrae información estructurada de texto sobre prospectos de negocio.
Dado un bloque de texto con información de un prospecto, extraé los siguientes campos en formato JSON:

- prospect_name: nombre de la persona o negocio (requerido)
- prospect_whatsapp: número de WhatsApp si se menciona (o null)
- prospect_ig: usuario de Instagram si se menciona, sin @ (o null)
- prospect_web: URL del sitio web si se menciona (o null)
- summary: resumen de la situación del prospecto. Usá la información del texto para crear un resumen claro y conciso que describa el negocio, situación actual, y objetivos. Máximo 3-4 oraciones.
- service_offered: si se menciona un servicio específico, usá "advance90" o "meta_advance" (o null)

Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones, sin backticks. Solo el JSON.
Si un campo no se puede determinar del texto, usá null.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'XAI_API_KEY no configurada' }, { status: 500 })
  }

  const { text } = await request.json()
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return NextResponse.json({ error: 'Texto muy corto o vacío' }, { status: 400 })
  }

  try {
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.trim() },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('xAI API error:', response.status, errorData)
      return NextResponse.json({ error: 'Error al procesar con IA' }, { status: 502 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'Respuesta vacía de IA' }, { status: 502 })
    }

    const parsed = JSON.parse(content)

    return NextResponse.json({
      prospect_name: parsed.prospect_name || '',
      prospect_whatsapp: parsed.prospect_whatsapp || '',
      prospect_ig: parsed.prospect_ig || '',
      prospect_web: parsed.prospect_web || '',
      summary: parsed.summary || '',
      service_offered: parsed.service_offered || null,
    })
  } catch (error) {
    console.error('Parse set text error:', error)
    return NextResponse.json({ error: 'Error al analizar el texto' }, { status: 500 })
  }
}
