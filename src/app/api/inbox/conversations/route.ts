import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';
import { getChannels } from '@/lib/api';

// 获取所有对话列表，用于 inbox 显示
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status'); // 'active', 'closed', 'pending'
        const channelId = searchParams.get('channelId');

        console.log(`Fetching conversations with limit: ${limit}, status: ${status}, channelId: ${channelId}`);

        // 获取所有渠道信息
        const channels = await getChannels();
        const channelMap = new Map(channels.map(ch => [ch.id, ch]));

        let allConversations = [];

        if (channelId) {
            // 获取特定渠道的对话
            const conversations = await firestoreService.getConversationsByChannel(channelId, limit);
            allConversations = conversations.map(conv => ({
                ...conv,
                channel: channelMap.get(conv.channelId) || {
                    id: conv.channelId,
                    name: 'Unknown Channel',
                    type: 'Widget',
                    status: 'offline'
                }
            }));
        } else {
            // 获取所有渠道的对话
            for (const channel of channels) {
                try {
                    const conversations = await firestoreService.getConversationsByChannel(channel.id, Math.ceil(limit / channels.length));
                    const conversationsWithChannel = conversations.map(conv => ({
                        ...conv,
                        channel: channel
                    }));
                    allConversations.push(...conversationsWithChannel);
                } catch (error) {
                    console.error(`Failed to get conversations for channel ${channel.id}:`, error);
                }
            }

            // 按最后活动时间排序
            allConversations.sort((a, b) =>
                new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );

            // 限制总数量
            allConversations = allConversations.slice(0, limit);
        }

        // 过滤状态
        if (status) {
            allConversations = allConversations.filter(conv => conv.status === status);
        }

        // 获取最近的消息内容
        const conversationsWithMessages = await Promise.all(
            allConversations.map(async (conv) => {
                try {
                    const messages = await firestoreService.getMessagesByConversation(conv.id, 1);
                    const lastMessage = messages[0];

                    return {
                        id: conv.id,
                        customer: {
                            name: conv.customerName,
                            avatar: conv.customerAvatar || `/api/placeholder/32/32?text=${encodeURIComponent(conv.customerName.charAt(0))}`,
                            phone: conv.customerPhone
                        },
                        channel: {
                            id: conv.channel.id,
                            name: conv.channel.name,
                            type: conv.channel.type
                        },
                        startTime: conv.createdAt,
                        status: conv.status,
                        agent: {
                            id: conv.assignedAgent || 'unassigned',
                            name: conv.assignedAgent ? 'Agent' : 'Unassigned',
                            avatar: '/api/placeholder/32/32?text=A'
                        },
                        tags: conv.tags || [],
                        summary: conv.summary || '',
                        lastMessage: {
                            id: lastMessage?.id || '',
                            from: lastMessage?.from === 'bot' ? 'agent' : (lastMessage?.from || 'customer'),
                            text: lastMessage?.text || '暂无消息',
                            timestamp: lastMessage?.timestamp || conv.lastMessageAt,
                            read: lastMessage?.read || false
                        },
                        unreadCount: messages.filter(msg => !msg.read && msg.from === 'customer').length
                    };
                } catch (msgError) {
                    console.error(`Failed to get messages for conversation ${conv.id}:`, msgError);
                    return {
                        id: conv.id,
                        customer: {
                            name: conv.customerName,
                            avatar: `/api/placeholder/32/32?text=${encodeURIComponent(conv.customerName.charAt(0))}`,
                            phone: conv.customerPhone
                        },
                        channel: {
                            id: conv.channel.id,
                            name: conv.channel.name,
                            type: conv.channel.type
                        },
                        startTime: conv.createdAt,
                        status: conv.status,
                        agent: {
                            id: 'unassigned',
                            name: 'Unassigned',
                            avatar: '/api/placeholder/32/32?text=A'
                        },
                        tags: conv.tags || [],
                        summary: conv.summary || '',
                        lastMessage: {
                            id: '',
                            from: 'customer',
                            text: '暂无消息',
                            timestamp: conv.lastMessageAt,
                            read: false
                        },
                        unreadCount: 0
                    };
                }
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                conversations: conversationsWithMessages,
                total: conversationsWithMessages.length,
                filters: {
                    status,
                    channelId,
                    limit
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to get conversations:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to get conversations',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// 创建新对话
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { channelId, customerName, customerPhone, initialMessage } = body;

        if (!channelId || !customerName || !customerPhone) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: channelId, customerName, customerPhone'
            }, { status: 400 });
        }

        // 检查是否已存在对话
        const existingConversations = await firestoreService.getConversationsByChannel(channelId);
        const existingConversation = existingConversations.find(conv => conv.customerPhone === customerPhone);

        if (existingConversation) {
            return NextResponse.json({
                success: true,
                data: {
                    conversation: existingConversation,
                    isNew: false
                },
                message: 'Conversation already exists'
            });
        }

        // 创建新对话
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const newConversation = {
            id: conversationId,
            channelId: channelId,
            customerName: customerName,
            customerPhone: customerPhone,
            status: 'active' as const,
            assignedAgent: '',
            tags: [],
            summary: '',
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await firestoreService.saveConversation(newConversation);

        // 如果有初始消息，保存它
        if (initialMessage) {
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const initialMsg = {
                id: messageId,
                conversationId: conversationId,
                channelId: channelId,
                from: 'customer' as const,
                to: 'agent',
                fromUser: customerPhone,
                text: initialMessage,
                timestamp: new Date().toISOString(),
                messageType: 'text' as any,
                metadata: {},
                read: false,
                createdAt: new Date().toISOString()
            };

            await firestoreService.saveMessage(initialMsg);
        }

        return NextResponse.json({
            success: true,
            data: {
                conversation: newConversation,
                isNew: true
            },
            message: 'New conversation created successfully'
        });

    } catch (error) {
        console.error('Failed to create conversation:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create conversation',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}