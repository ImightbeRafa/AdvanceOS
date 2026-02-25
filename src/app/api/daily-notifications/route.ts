import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  let followUpCount = 0
  let taskCount = 0

  const { data: followUpDeals } = await supabase
    .from('deals')
    .select('id, set_id, follow_up_date, sets!inner(closer_id, prospect_name)')
    .eq('outcome', 'follow_up')
    .gte('follow_up_date', `${today}T00:00:00`)
    .lte('follow_up_date', `${today}T23:59:59`)

  for (const deal of followUpDeals ?? []) {
    const set = deal.sets as unknown as { closer_id: string; prospect_name: string }
    if (!set?.closer_id) continue

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', set.closer_id)
      .eq('type', 'follow_up_today')
      .gte('created_at', `${today}T00:00:00`)
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

  const { data: dueTasks } = await supabase
    .from('tasks')
    .select('id, title, assigned_to, client_id')
    .eq('due_date', today)
    .in('status', ['pendiente', 'en_progreso'])
    .not('assigned_to', 'is', null)

  for (const task of dueTasks ?? []) {
    if (!task.assigned_to) continue

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', task.assigned_to)
      .eq('type', 'task_due_today')
      .gte('created_at', `${today}T00:00:00`)
      .like('message', `%${task.title}%`)
      .limit(1)

    if (existing && existing.length > 0) continue

    await supabase.from('notifications').insert({
      user_id: task.assigned_to,
      type: 'task_due_today',
      title: 'Tarea vence hoy',
      message: `La tarea "${task.title}" vence hoy`,
      action_url: task.client_id ? `/clientes/${task.client_id}` : '/clientes',
    })
    taskCount++
  }

  return NextResponse.json({
    ok: true,
    date: today,
    followUpNotifications: followUpCount,
    taskNotifications: taskCount,
  })
}
