import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';

// Get channel statistics and recent activity
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get('channelId');

        if (!channelId) {
            return NextResponse.json({
                success: false,
                error: 'Channel ID is required'
            }, { status: 400 });
        }

        // Get channel info from Firestore
        const channel = await firestoreService.getChannel(channelId);
        if (!channel) {
            return NextResponse.json({
                success: false,
                error: 'Channel not found'
            }, { status: 404 });
        }

        // Get recent conversations and statistics
        const conversations = await firestoreService.getConversationsByChannel(channelId, 10);

        // Calculate statistics
        const activeConversations = conversations.filter(c => c.status === 'active').length;
        const totalMessages = await getTotalMessagesByChannel(channelId);

        const lastActivityTime = conversations.length > 0
            ? conversations[0].lastMessageAt
            : channel.updatedAt;

        return NextResponse.json({
            success: true,
            data: {
                channel: {
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    status: channel.status,
                    phoneNumber: channel.phoneNumber,
                    connectedAt: channel.connectedAt,
                },
                statistics: {
                    totalConversations: conversations.length,
                    activeConversations,
                    totalMessages,
                    lastActivity: lastActivityTime,
                },
                recentConversations: conversations.slice(0, 5).map(conv => ({
                    id: conv.id,
                    customerName: conv.customerName,
                    customerPhone: conv.customerPhone,
                    lastMessage: conv.lastMessageAt,
                    status: conv.status,
                }))
            },
            message: 'Channel overview retrieved successfully'
        });

    } catch (error) {
        console.error('Failed to get channel overview:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to get channel overview',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

async function getTotalMessagesByChannel(channelId: string): Promise<number> {
    try {
        const conversations = await firestoreService.getConversationsByChannel(channelId, 100);
        let totalMessages = 0;

        for (const conversation of conversations) {
            const messages = await firestoreService.getMessagesByConversation(conversation.id, 1000);
            totalMessages += messages.length;
        }

        return totalMessages;
    } catch (error) {
        console.error('Failed to count messages:', error);
        return 0;
    }
}