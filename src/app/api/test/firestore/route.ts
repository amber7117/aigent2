import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';

// 测试 Firestore 数据保存功能的端点
export async function GET(request: NextRequest) {
    try {
        console.log('Testing Firestore data persistence...');

        // 测试获取所有保存的数据
        const [messages, aiAgents] = await Promise.all([
            firestoreService.getConversationsByChannel('test-channel', 10),
            firestoreService.getAIAgents()
        ]);

        return NextResponse.json({
            success: true,
            data: {
                messages: {
                    count: messages.length,
                    items: messages.slice(0, 5) // 只返回前5条消息用于查看
                },
                aiAgents: {
                    count: aiAgents.length,
                    items: aiAgents
                }
            },
            message: 'Firestore data persistence test completed successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Firestore data test failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Firestore data test failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// 测试保存数据到 Firestore
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, data } = body;

        let result = null;

        switch (action) {
            case 'save-test-message':
                result = await firestoreService.saveMessage({
                    id: `test-msg-${Date.now()}`,
                    conversationId: 'test-conversation',
                    channelId: 'test-channel',
                    from: 'customer' as const,
                    to: 'bot',
                    fromUser: '+86 138 0000 0000',
                    text: data?.message || '测试消息：数据保存功能',
                    timestamp: new Date().toISOString(),
                    messageType: 'text' as any,
                    metadata: { isTest: true },
                    read: false,
                    createdAt: new Date().toISOString()
                });
                break;

            case 'save-test-channel':
                result = await firestoreService.saveChannel({
                    id: `test-ch-${Date.now()}`,
                    name: data?.name || '测试渠道',
                    type: 'WhatsApp',
                    status: 'online',
                    lastActivity: '刚刚',
                    agentId: 'test-agent-1',
                    autoReply: true,
                    phoneNumber: '+86 138 0000 0000'
                });
                break;

            case 'save-test-agent':
                result = await firestoreService.saveAIAgent({
                    id: `test-agent-${Date.now()}`,
                    name: data?.name || '测试智能体',
                    description: '用于测试数据保存功能的智能体',
                    provider: 'Gemini',
                    prompt: '你是一个测试智能体，专门用于验证数据保存功能。',
                    model: 'gemini-1.5-flash',
                    channelIds: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return NextResponse.json({
            success: true,
            action,
            result,
            message: `Firestore ${action} completed successfully`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Firestore save test failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Firestore save test failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}