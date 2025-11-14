import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';
import type { Conversation } from '@/lib/types';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get conversation from Firestore
        const conversation = await firestoreService.getConversation(params.id);

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Get messages for this conversation
        const messages = await firestoreService.getMessagesByConversation(params.id, 100);

        // Format as expected Conversation type
        const formattedConversation: Conversation = {
            id: conversation.id,
            customer: {
                name: conversation.customerName || 'Unknown Customer',
                avatar: conversation.customerAvatar || '/placeholder-avatar.png'
            },
            channel: {
                id: conversation.channelId,
                name: conversation.channelId, // Use channelId as name if no channel data
                type: 'WhatsApp' // Default type
            },
            startTime: conversation.createdAt || new Date().toISOString(),
            status: conversation.status === 'closed' ? 'closed' : 'open',
            agent: {
                id: conversation.assignedAgent || 'default-agent',
                name: conversation.assignedAgent ? 'Assigned Agent' : 'Unassigned',
                avatar: '/placeholder-avatar.png'
            },
            tags: conversation.tags || [],
            summary: conversation.summary || '',
            messages: messages.map(msg => ({
                id: msg.id,
                from: msg.from === 'customer' ? 'customer' : 'agent',
                text: msg.text,
                timestamp: msg.timestamp,
                read: msg.read || false
            }))
        };

        return NextResponse.json({
            conversation: formattedConversation
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Update conversation (for marking as read, etc.)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        // Update conversation in Firestore
        await firestoreService.updateConversation(params.id, {
            unreadCount: body.unreadCount,
            lastReadAt: body.lastReadAt,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating conversation:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Send reply through specific channel
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { message, agentId } = body;

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Get conversation to determine channel
        const conversation = await firestoreService.getConversation(params.id);

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Send reply through appropriate channel API
        const replyResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/channels/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channelId: conversation.channelId,
                recipientId: conversation.customerPhone || conversation.id,
                message,
                agentId
            })
        });

        if (!replyResponse.ok) {
            const errorData = await replyResponse.json();
            return NextResponse.json(
                { error: errorData.error || 'Failed to send reply' },
                { status: 500 }
            );
        }

        const replyData = await replyResponse.json();

        return NextResponse.json({
            success: true,
            messageId: replyData.messageId
        });
    } catch (error) {
        console.error('Error sending reply:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
