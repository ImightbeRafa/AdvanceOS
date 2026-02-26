import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  const isCronAuth = authHeader === `Bearer ${expectedToken}`

  if (!isCronAuth) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch rate' }, { status: 500 })
    }

    const data = await response.json()
    const crcRate = data.rates?.CRC ?? 530

    const supabase = await createServiceClient()
    const today = new Date().toISOString().split('T')[0]

    await supabase
      .from('exchange_rates')
      .upsert({
        date: today,
        usd_to_crc: crcRate,
        source: 'exchangerate-api',
      }, { onConflict: 'date' })

    return NextResponse.json({ date: today, usd_to_crc: crcRate })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
