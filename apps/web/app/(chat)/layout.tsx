import type { ConversationDTO } from '@kalehub/types';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/chat/Sidebar';
import { env } from '@/env';
import { auth } from '@/lib/auth';

async function fetchConversations(accessToken: string): Promise<ConversationDTO[]> {
  const res = await fetch(`${env.API_URL}/conversations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  return res.json() as Promise<ConversationDTO[]>;
}

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/sign-in');

  const conversations = await fetchConversations(session.accessToken);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar conversations={conversations} currentUserId={session.userId} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
