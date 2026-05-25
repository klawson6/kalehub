import { notFound, redirect } from 'next/navigation'
import type { MessageDTO } from '@kalehub/types'
import { auth } from '@/lib/auth'
import { ChatWindow } from '@/components/chat/ChatWindow'

async function fetchMessages(
  conversationId: string,
  accessToken: string,
): Promise<MessageDTO[]> {
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:3001'
  const res = await fetch(
    `${apiUrl}/conversations/${conversationId}/messages?limit=50`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    },
  )
  if (res.status === 403 || res.status === 404) return []
  if (!res.ok) throw new Error('Failed to load messages')
  const body = (await res.json()) as { items: MessageDTO[] }
  return body.items.reverse()
}

export default async function DmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect('/sign-in')

  let messages: MessageDTO[]
  try {
    messages = await fetchMessages(id, session.accessToken)
  } catch {
    notFound()
  }

  return (
    <ChatWindow
      conversationId={id}
      currentUserId={session.userId}
      accessToken={session.accessToken}
      initialMessages={messages}
    />
  )
}
