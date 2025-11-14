import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppManager } from '@/lib/whatsapp-client';
import { firestoreService } from '@/lib/firestore-service';
import { getDatabase, generateMessageId, createConversationId } from '@/lib/database';

// 发送人工回复到指定渠道
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            channelId,
            conversationId,
            toUser,
            message,
            messageType = 'text',
            agentName = 'Human Agent',
            agentId = 'human-agent'
        } = body;

        if (!channelId || !toUser || !message) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: channelId, toUser, message'
            }, { status: 400 });
        }

        console.log(`Sending manual reply from channel ${channelId} to ${toUser}: ${message}`);

        let success = false;
        let messageId = generateMessageId();
        const timestamp = new Date();

        // 根据渠道类型发送消息
        if (channelId.includes('whatsapp') || channelId.startsWith('whatsapp_')) {
            // 发送到 WhatsApp
            const whatsappManager = getWhatsAppManager();
            success = await whatsappManager.sendMessage(channelId, toUser, message);

            if (success) {
                console.log(`WhatsApp message sent successfully to ${toUser}`);
            } else {
                console.error(`Failed to send WhatsApp message to ${toUser}`);
            }
        } else if (channelId.includes('wechat')) {
            // 发送到 WeChat (未来实现)
            console.log(`WeChat messaging not implemented yet for channel: ${channelId}`);
            success = false;
        } else {
            // 其他渠道类型
            console.log(`Channel type not supported for manual reply: ${channelId}`);
            success = false;
        }

        // 无论发送是否成功，都保存消息记录
        const database = getDatabase();
        const finalConversationId = conversationId || createConversationId(channelId, toUser);

        // 创建消息对象
        const conversationMessage = {
            id: messageId,
            channelId: channelId,
            conversationId: finalConversationId,
            fromUser: 'agent',
            fromUserName: agentName,
            toUser: toUser,
            messageText: message,
            messageType: messageType as any,
            timestamp: timestamp,
            isFromBot: false, // 这是人工回复，不是机器人
            isRead: true,
            deliveryStatus: success ? ('sent' as any) : ('failed' as any),
            metadata: {
                platform: channelId.includes('whatsapp') ? 'WhatsApp' :
                    channelId.includes('wechat') ? 'WeChat' : 'Unknown',
                isManualReply: true,
                agentId: agentId,
                agentName: agentName,
                sentAt: timestamp.toISOString()
            }
        };

        // 保存到本地数据库
        await database.saveMessage(conversationMessage);

        // 保存到 Firestore
        const firestoreMessage = {
            id: conversationMessage.id,
            conversationId: conversationMessage.conversationId,
            channelId: channelId,
            from: 'agent' as const,
            to: conversationMessage.toUser,
            fromUser: conversationMessage.fromUser,
            text: conversationMessage.messageText,
            timestamp: conversationMessage.timestamp.toISOString(),
            messageType: messageType as any,
            metadata: conversationMessage.metadata,
            read: conversationMessage.isRead,
            createdAt: new Date().toISOString(),
        };

        try {
            await firestoreService.saveMessage(firestoreMessage);
            console.log(`Manual reply saved to Firestore: ${messageId}`);
        } catch (firestoreError) {
            console.error('Failed to save manual reply to Firestore:', firestoreError);
            // 不影响主要功能，继续执行
        }

        return NextResponse.json({
            success: success,
            data: {
                messageId: messageId,
                channelId: channelId,
                conversationId: finalConversationId,
                toUser: toUser,
                message: message,
                deliveryStatus: success ? 'sent' : 'failed',
                timestamp: timestamp.toISOString(),
                agentInfo: {
                    agentId: agentId,
                    agentName: agentName,
                    isManual: true
                }
            },
            message: success ? 'Message sent successfully' : 'Message saved but delivery failed'
        });

    } catch (error) {
        console.error('Failed to send manual reply:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send manual reply',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// 获取渠道信息和会话状态
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

        // 获取渠道状态信息
        let channelStatus = {
            connected: false,
            type: 'Unknown',
            lastActivity: 'Never'
        };

        if (channelId.includes('whatsapp') || channelId.startsWith('whatsapp_')) {
            const whatsappManager = getWhatsAppManager();
            channelStatus.connected = whatsappManager.isSessionConnected(channelId);
            channelStatus.type = 'WhatsApp';
        }

        // 获取最近的对话
        const recentConversations = await firestoreService.getConversationsByChannel(channelId, 10);

        return NextResponse.json({
            success: true,
            data: {
                channelId,
                channelStatus,
                recentConversations: recentConversations.length,
                conversations: recentConversations.map(conv => ({
                    id: conv.id,
                    customerName: conv.customerName,
                    customerPhone: conv.customerPhone,
                    lastMessageAt: conv.lastMessageAt,
                    status: conv.status,
                    summary: conv.summary || ''
                }))
            }
        });

    } catch (error) {
        console.error('Failed to get channel info:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get channel info',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}