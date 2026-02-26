import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { todayCR, startOfDayCR, endOfDayCR } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const today = todayCR()
  let followUpCount = 0

  const { data: followUpDeals } = await supabase
    .from('deals')
    .select('id, set_id, follow_up_date, sets!inner(closer_id, prospect_name)')
    .eq('outcome', 'follow_up')
    .gte('follow_up_date', startOfDayCR(today))
    .lte('follow_up_date', endOfDayCR(today))

  for (const deal of followUpDeals ?? []) {
    const set = deal.sets as unknown as { closer_id: string; prospect_name: string }
    if (!set?.closer_id) continue

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', set.closer_id)
      .eq('type', 'follow_up_today')
      .gte('created_at', startOfDayCR(today))
      .like('action_url', `%${deal.set_id}%`)
      .limit(1)

    if (existing && existing.length > 0) continue

    await supabase.from('notifications').insert({
      user_id: set.closer_id,
      type: 'follow_up_today',
      title: 'Follow up hoy',
      message: `Tenés un follow up pendiente con ${set.prospect_name}`,
      action_url: '/ventas',
    })
    followUpCount++
  }

  return NextResponse.json({
    ok: true,
    date: today,
    followUpNotifications: followUpCount,
  })
}
