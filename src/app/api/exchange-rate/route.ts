import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
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
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
