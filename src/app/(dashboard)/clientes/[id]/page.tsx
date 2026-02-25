import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClientProfile } from '@/components/clientes/client-profile'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'closer', 'delivery'].includes(profile.role)) {
    redirect('/')
  }

  const { data: client } = await supabase
    .from('clients')
    .select(`
      *,
      deal:deals(*),
      set:sets(*, setter:profiles!sets_setter_id_fkey(id, full_name), closer:profiles!sets_closer_id_fkey(id, full_name)),
      assigned_member:profiles!clients_assigned_to_fkey(id, full_name)
    `)
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: onboarding } = await supabase
    .from('onboarding_checklist')
    .select('*')
    .eq('client_id', id)
    .order('item_key')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assigned_member:profiles!tasks_assigned_to_fkey(id, full_name)')
    .eq('client_id', id)
    .order('due_date')

  const { data: phases } = await supabase
    .from('advance90_phases')
    .select('*')
    .eq('client_id', id)
    .order('order')

  const { data: payments } = await supabase
    .from('payments')
    .select('*, commissions(*, team_member:profiles!commissions_team_member_id_fkey(id, full_name))')
    .eq('client_id', id)
    .order('payment_date', { ascending: false })

  const { data: assets } = await supabase
    .from('client_assets')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: activityLog } = await supabase
    .from('activity_log')
    .select('*, user:profiles!activity_log_user_id_fkey(id, full_name)')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('active', true)

  const { data: clientForm } = await supabase
    .from('client_forms')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <ClientProfile
      client={client}
      onboarding={onboarding ?? []}
      tasks={tasks ?? []}
      phases={phases ?? []}
      payments={payments ?? []}
      assets={assets ?? []}
      activityLog={activityLog ?? []}
      teamMembers={teamMembers ?? []}
      userRole={profile.role}
      clientForm={clientForm}
    />
  )
}
