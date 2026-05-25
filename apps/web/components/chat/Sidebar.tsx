import type { ConversationDTO } from '@kalehub/types'
import { ConversationItem } from './ConversationItem'

interface Props {
  conversations: ConversationDTO[]
  currentUserId: string
}

export function Sidebar({ conversations, currentUserId }: Props) {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen">
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Kalehub</h1>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {conversations.length === 0 && (
          <p className="px-2 py-2 text-xs text-gray-400">No conversations yet</p>
        )}
        {conversations.map((c) => (
          <ConversationItem
            key={c.id}
            conversation={c}
            currentUserId={currentUserId}
          />
        ))}
      </nav>
    </aside>
  )
}
