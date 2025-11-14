import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';

// Get chat history for a channel
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get('channelId');
        const limit = parseInt(searchParams.get('limit') || '100');

        if (!channelId) {
            return NextResponse.json({
                success: false,
                error: 'Channel ID is required'
            }, { status: 400 });
        }

        console.log(`Loading chat history for channel: ${channelId}`);

        // Get chat history from Firestore
        const chatHistory = await firestoreService.getChatHistory(channelId, limit);

        return NextResponse.json({
            success: true,
            data: {
                channelId,
                conversations: chatHistory.conversations,
                messages: chatHistory.messages,
                totalConversations: chatHistory.conversations.length,
                totalMessages: Object.values(chatHistory.messages).reduce((sum, msgs) => sum + msgs.length, 0)
            },
            message: `Loaded chat history for channel ${channelId}`
        });

    } catch (error) {
        console.error('Failed to load chat history:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to load chat history',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Search conversations
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query, channelId, limit = 20 } = body;

        if (!query) {
            return NextResponse.json({
                success: false,
                error: 'Search query is required'
            }, { status: 400 });
        }

        console.log(`Searching conversations: "${query}" in channel: ${channelId || 'all'}`);

        // Search conversations in Firestore
        const results = await firestoreService.searchConversations(query, channelId);

        return NextResponse.json({
            success: true,
            data: {
                query,
                channelId,
                results: results.slice(0, limit),
                totalResults: results.length
            },
            message: `Found ${results.length} conversations matching "${query}"`
        });

    } catch (error) {
        console.error('Failed to search conversations:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to search conversations',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}