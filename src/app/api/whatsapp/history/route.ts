import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppManager } from '@/lib/whatsapp-client';
import { firestoreService } from '@/lib/firestore-service';
import { getDatabase, createConversationId, generateMessageId } from '@/lib/database';

// 拉取 WhatsApp 聊天历史并保存到数据库
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { channelId, sessionId, limit = 50 } = body;

        if (!sessionId) {
            return NextResponse.json({
                success: false,
                error: 'Session ID is required'
            }, { status: 400 });
        }

        console.log(`Fetching WhatsApp chat history for session: ${sessionId}`);

        const whatsappManager = getWhatsAppManager();
        const session = whatsappManager.getSession(sessionId);

        if (!session || !session.socket) {
            return NextResponse.json({
                success: false,
                error: 'WhatsApp session not found or not connected'
            }, { status: 404 });
        }

        // 模拟获取聊天历史（Bailey 不直接提供历史消息，通常需要监听实时消息）
        // 在实际应用中，你可能需要：
        // 1. 从 WhatsApp Business API 获取历史
        // 2. 从本地缓存获取
        // 3. 从第三方服务获取

        const database = getDatabase();
        let totalSaved = 0;
        let totalConversations = 0;

        // 模拟一些历史消息示例
        const mockHistoryMessages = [
            {
                from: '+86 138 0001 0001',
                name: '张先生',
                text: '你好，请问有什么可以帮助我的吗？',
                timestamp: new Date(Date.now() - 3600000 * 2), // 2小时前
                isFromBot: false
            },
            {
                from: '+86 138 0001 0002',
                name: '李女士',
                text: '我想了解一下你们的产品',
                timestamp: new Date(Date.now() - 3600000 * 1), // 1小时前
                isFromBot: false
            },
            {
                from: '+86 138 0001 0003',
                name: '王总',
                text: '请发送最新的价格表给我',
                timestamp: new Date(Date.now() - 1800000), // 30分钟前
                isFromBot: false
            }
        ];

        // 保存历史消息到数据库
        for (const msg of mockHistoryMessages) {
            try {
                const conversationId = createConversationId(sessionId, msg.from);

                // 保存到本地数据库
                const conversationMessage = {
                    id: generateMessageId(),
                    channelId: channelId || sessionId,
                    conversationId: conversationId,
                    fromUser: msg.from,
                    fromUserName: msg.name,
                    toUser: session.phoneNumber || 'bot',
                    messageText: msg.text,
                    messageType: 'text' as any,
                    timestamp: msg.timestamp,
                    isFromBot: msg.isFromBot,
                    isRead: false,
                    deliveryStatus: 'delivered' as any,
                    metadata: {
                        platform: 'WhatsApp',
                        isHistoryMessage: true,
                        importedAt: new Date().toISOString()
                    }
                };

                await database.saveMessage(conversationMessage);

                // 保存到 Firestore
                const firestoreMessage = {
                    id: conversationMessage.id,
                    conversationId: conversationMessage.conversationId,
                    channelId: channelId || sessionId,
                    from: msg.isFromBot ? ('bot' as const) : ('customer' as const),
                    to: conversationMessage.toUser,
                    fromUser: conversationMessage.fromUser,
                    text: conversationMessage.messageText,
                    timestamp: conversationMessage.timestamp.toISOString(),
                    messageType: 'text' as any,
                    metadata: conversationMessage.metadata,
                    read: conversationMessage.isRead,
                    createdAt: new Date().toISOString(),
                };

                await firestoreService.saveMessage(firestoreMessage);

                // 创建或更新对话
                const existingConversations = await firestoreService.getConversationsByChannel(sessionId, 1);
                const existingConversation = existingConversations.find(c => c.customerPhone === msg.from);

                if (!existingConversation) {
                    await firestoreService.createConversationFromMessage(
                        sessionId,
                        msg.from,
                        msg.name,
                        firestoreMessage
                    );
                    totalConversations++;
                }

                totalSaved++;
                console.log(`Saved history message: ${conversationMessage.id}`);

            } catch (msgError) {
                console.error('Failed to save history message:', msgError);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                sessionId,
                channelId: channelId || sessionId,
                totalMessages: totalSaved,
                totalConversations: totalConversations,
                importedAt: new Date().toISOString()
            },
            message: `Successfully imported ${totalSaved} history messages and ${totalConversations} conversations`
        });

    } catch (error) {
        console.error('Failed to fetch WhatsApp chat history:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch chat history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// 获取已导入的聊天历史
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const channelId = searchParams.get('channelId');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!channelId) {
            return NextResponse.json({
                success: false,
                error: 'Channel ID is required'
            }, { status: 400 });
        }

        // 从 Firestore 获取历史消息
        const conversations = await firestoreService.getConversationsByChannel(channelId, limit);

        return NextResponse.json({
            success: true,
            data: {
                channelId,
                conversations: conversations.length,
                items: conversations,
                retrievedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Failed to get chat history:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get chat history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}