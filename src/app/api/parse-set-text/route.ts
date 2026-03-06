import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const XAI_MODEL = 'grok-4-1-fast-reasoning'

const TEXT_SYSTEM_PROMPT = `Sos un asistente que extrae información estructurada de texto sobre prospectos de negocio.
Dado un bloque de texto con información de un prospecto, extraé los siguientes campos en formato JSON:

- prospect_name: nombre de la persona o negocio (requerido)
- prospect_whatsapp: número de WhatsApp si se menciona (o null)
- prospect_ig: usuario de Instagram si se menciona, sin @ (o null)
- prospect_web: URL del sitio web si se menciona (o null)
- summary: resumen de la situación del prospecto. Usá la información del texto para crear un resumen claro y conciso que describa el negocio, situación actual, y objetivos. Máximo 3-4 oraciones.
- service_offered: si se menciona un servicio específico, usá "advance90" o "meta_advance". También mapeá: "Meta Advance" o "MA" → "meta_advance", "Advance90" o "A90" → "advance90" (o null)
- closer_name: nombre del closer asignado si se menciona (o null). Buscá patrones como "Closer: [nombre]" o "Closer [nombre]"

Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, sin explicaciones, sin backticks. Solo el JSON.
Si un campo no se puede determinar del texto, usá null.`

const IMAGE_SYSTEM_PROMPT = `Actúa como un especialista en appointment setting para agencias de marketing high ticket.

Tu tarea es analizar una conversación entre un setter y un lead (proporcionada como capturas de pantalla) y generar un resumen corto para el closer.

Debes seguir EXACTAMENTE estos parámetros:

1. El resumen debe iniciar con:
   Nombre de la persona – IG: (usuario de Instagram o red social del negocio)

2. El resumen debe estar escrito en prosa, en un solo párrafo o máximo dos, sin listas ni subtítulos.

3. El resumen debe incluir únicamente la información relevante para el closer:
   - Qué negocio tiene el lead
   - Cuánto tiempo lleva operando
   - Si mencionó ingresos aproximados o volumen de ventas
   - Qué ha intentado para crecer o atraer clientes
   - Cuál es el problema principal que quiere resolver
   - Qué tipo de ayuda cree necesitar (marketing, anuncios, contenido, ventas, etc.)
   - Si aceptó agendar llamada o mostró interés en una estrategia

4. El tono debe ser neutral, claro y profesional, como una nota interna para el equipo de ventas.

5. No inventes información. Solo usa lo que aparece en la conversación.

6. Al final del resumen debes clasificar el lead con uno de estos tags:
   MA → Si el lead busca aprender de marketing/ventas o crecimiento del negocio.
   A90 → Si el lead encaja mejor en un programa estructurado o escalamiento más profundo como llevarle la producción y contenido estratégico.

Además del resumen formateado, extraé estos campos adicionales y respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin backticks, sin explicaciones):

- prospect_name: nombre de la persona o negocio (requerido)
- prospect_ig: usuario de Instagram sin @ (o null si no se ve claro en la conversación)
- prospect_whatsapp: número de WhatsApp si se menciona (o null)
- prospect_web: URL del sitio web si se menciona (o null)
- service_offered: "meta_advance" si clasificaste como MA, "advance90" si clasificaste como A90
- closer_name: nombre del closer asignado si se menciona en la conversación (o null)
- summary: el resumen completo formateado como se indicó arriba (Nombre – IG + prosa + tag MA o A90)

Solo el JSON.`

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

  const body = await request.json()
  const text: string | undefined = body.text
  const images: string[] | undefined = body.images

  const hasText = text && typeof text === 'string' && text.trim().length >= 10
  const hasImages = Array.isArray(images) && images.length > 0

  if (!hasText && !hasImages) {
    return NextResponse.json({ error: 'Proporcioná texto o imágenes para analizar' }, { status: 400 })
  }

  if (hasImages && images.length > 5) {
    return NextResponse.json({ error: 'Máximo 5 imágenes permitidas' }, { status: 400 })
  }

  try {
    const systemPrompt = hasImages ? IMAGE_SYSTEM_PROMPT : TEXT_SYSTEM_PROMPT

    // Build user content array
    type ContentPart =
      | { type: 'input_image'; image_url: string; detail: string }
      | { type: 'input_text'; text: string }

    const userContent: ContentPart[] = []

    if (hasImages) {
      for (const img of images) {
        userContent.push({
          type: 'input_image',
          image_url: img,
          detail: 'high',
        })
      }
    }

    if (hasText) {
      userContent.push({
        type: 'input_text',
        text: text.trim(),
      })
    } else if (hasImages) {
      userContent.push({
        type: 'input_text',
        text: 'Analizá las capturas de pantalla de la conversación y generá el resumen siguiendo la estructura indicada.',
      })
    }

    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        store: false,
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

    // Clean potential markdown wrapping from response
    const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleanContent)

    const igValue = parsed.prospect_ig || ''

    return NextResponse.json({
      prospect_name: parsed.prospect_name || '',
      prospect_whatsapp: parsed.prospect_whatsapp || '',
      prospect_ig: igValue,
      prospect_web: parsed.prospect_web || '',
      summary: parsed.summary || '',
      service_offered: parsed.service_offered || null,
      closer_name: parsed.closer_name || null,
      ig_missing: !igValue,
    })
  } catch (error) {
    console.error('Parse set text error:', error)
    return NextResponse.json({ error: 'Error al analizar el texto' }, { status: 500 })
  }
}
