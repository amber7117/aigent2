import ChatDisplay from '@/components/dashboard/chat-display';
import { notFound } from 'next/navigation';
import { Conversation } from '@/lib/types';

async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/inbox/conversations/${id}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.conversation;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return null;
  }
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const conversation = await getConversation(params.id);

  if (!conversation) {
    notFound();
  }

  return <ChatDisplay conversation={conversation} />;
}
