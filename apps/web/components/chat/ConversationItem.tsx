'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ConversationDTO } from '@kalehub/types'

interface Props {
  conversation: ConversationDTO
  currentUserId: string
}

export function ConversationItem({ conversation, currentUserId }: Props) {
  const pathname = usePathname()
  const active = pathname === `/dm/${conversation.id}`
  const other = conversation.participants.find((p) => p.id !== currentUserId)
  const label = other?.name ?? other?.email ?? 'Unknown'

  return (
    <Link
      href={`/dm/${conversation.id}`}
      className={`block px-4 py-3 rounded-lg text-sm font-medium truncate transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-800'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </Link>
  )
}
