'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FeedbackTicketFormData, FeedbackReplyFormData } from '@/lib/schemas'
import type { FeedbackStatus, FeedbackContext } from '@/types'

export async function createTicket(data: FeedbackTicketFormData, metadata?: FeedbackContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('feedback_tickets')
    .insert({
      user_id: user.id,
      category: data.category,
      priority: data.priority,
      subject: data.subject,
      description: data.description,
      metadata: metadata ?? {},
    })

  if (error) throw new Error(error.message)
  revalidatePath('/feedback')
}

export async function getTickets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('feedback_tickets')
    .select('*, user:profiles!feedback_tickets_user_id_fkey(id, full_name, email, avatar_url, role), assigned_member:profiles!feedback_tickets_assigned_to_fkey(id, full_name)')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  const { data } = await query
  return data ?? []
}

export async function getTicketById(ticketId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: ticket } = await supabase
    .from('feedback_tickets')
    .select('*, user:profiles!feedback_tickets_user_id_fkey(id, full_name, email, avatar_url, role), assigned_member:profiles!feedback_tickets_assigned_to_fkey(id, full_name)')
    .eq('id', ticketId)
    .single()

  if (!ticket) return null

  const { data: replies } = await supabase
    .from('feedback_replies')
    .select('*, user:profiles!feedback_replies_user_id_fkey(id, full_name, avatar_url, role)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  return { ...ticket, replies: replies ?? [] }
}

export async function updateTicketStatus(ticketId: string, status: FeedbackStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Sin permisos')

  const { error } = await supabase
    .from('feedback_tickets')
    .update({ status })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)
  revalidatePath('/feedback')
}

export async function updateTicketAssignment(ticketId: string, assignedTo: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Sin permisos')

  const { error } = await supabase
    .from('feedback_tickets')
    .update({ assigned_to: assignedTo })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)
  revalidatePath('/feedback')
}

export async function updateTicketAdminNotes(ticketId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Sin permisos')

  const { error } = await supabase
    .from('feedback_tickets')
    .update({ admin_notes: notes })
    .eq('id', ticketId)

  if (error) throw new Error(error.message)
  revalidatePath('/feedback')
}

export async function replyToTicket(ticketId: string, data: FeedbackReplyFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('feedback_replies')
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      message: data.message,
      is_internal: data.is_internal ?? false,
    })

  if (error) throw new Error(error.message)

  const { data: ticket } = await supabase
    .from('feedback_tickets')
    .select('user_id')
    .eq('id', ticketId)
    .single()

  if (ticket && ticket.user_id !== user.id && !data.is_internal) {
    await supabase.from('notifications').insert({
      user_id: ticket.user_id,
      type: 'feedback_reply',
      title: 'Respuesta a tu ticket',
      message: data.message.substring(0, 100),
      action_url: null,
    })
  }

  revalidatePath('/feedback')
}

export async function getUserTicketCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('feedback_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['abierto', 'en_revision'])

  return count ?? 0
}
