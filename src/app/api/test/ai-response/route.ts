import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to verify AI auto-reply functionality
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, agentId, channelId } = body;

        // Simulate calling the AI response API
        const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agents/response`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message || '你好，我需要帮助',
                agentId: agentId || 'agent-1',
                channelId: channelId || 'ch-1',
                sessionId: 'test-conversation-001',
                fromUser: '+86 138 0013 8000',
                toUser: 'bot'
            }),
        });

        const aiResult = await aiResponse.json();

        return NextResponse.json({
            success: true,
            testMessage: message || '你好，我需要帮助',
            aiResponse: aiResult,
            message: 'AI auto-reply test completed successfully'
        });

    } catch (error) {
        console.error('AI response test failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'AI response test failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}