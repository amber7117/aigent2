import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { Api } from "telegram/tl";
import { getDatabase } from './database';
import { firestoreService } from './firestore-service';
import { getAIAgentManager } from './ai-agent-manager';

interface TelegramSession {
    id: string;
    sessionString: string;
    phoneNumber?: string;
    userId?: string;
    isConnected: boolean;
    client?: TelegramClient;
    apiId: number;
    apiHash: string;
    createdAt: string;
    updatedAt: string;
}

interface TelegramMessage {
    id: string;
    sessionId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    messageText: string;
    messageType: 'text' | 'image' | 'video' | 'document' | 'voice' | 'location' | 'contact';
    timestamp: string;
    isFromBot: boolean;
    isRead: boolean;
    deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed';
    metadata: {
        platform: 'telegram';
        rawMessage?: any;
        replyToMessageId?: string;
        isGroupMessage?: boolean;
        groupName?: string;
        aiAgent?: {
            id: string;
            responseGenerated: boolean;
        };
    };
}

export class TelegramClientManager {
    private sessions: Map<string, TelegramSession> = new Map();
    private database = getDatabase();
    private autoReplyEnabled: Map<string, boolean> = new Map();
    private agentBindings: Map<string, string> = new Map(); // sessionId -> agentId

    constructor() {
        console.log('Telegram Client Manager initialized');
        this.loadSessionsFromStorage();
    }

    // 创建新的Telegram会话
    async createSession(sessionId: string, apiId: number, apiHash: string): Promise<TelegramSession> {
        const stringSession = new StringSession("");

        const session: TelegramSession = {
            id: sessionId,
            sessionString: "",
            isConnected: false,
            apiId,
            apiHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    // 启动Telegram客户端连接
    async startSession(sessionId: string, phoneNumber: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        try {
            const client = new TelegramClient(
                new StringSession(session.sessionString),
                session.apiId,
                session.apiHash,
                {
                    connectionRetries: 5,
                    useWSS: false,
                }
            );

            await client.start({
                phoneNumber: async () => phoneNumber,
                password: async () => await this.getPassword(),
                phoneCode: async () => await this.getPhoneCode(),
                onError: (err) => {
                    console.error('Telegram client error:', err);
                },
            });

            // 保存会话字符串
            const savedSession = client.session.save();
            session.sessionString = typeof savedSession === 'string' ? savedSession : '';
            session.phoneNumber = phoneNumber;
            // 获取用户ID
            const me = await client.getMe();
            session.userId = me?.id?.toString();
            session.isConnected = true;
            session.client = client;
            session.updatedAt = new Date().toISOString();

            // 设置消息监听器
            this.setupMessageHandlers(client, sessionId);

            console.log(`Telegram session ${sessionId} started successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to start Telegram session ${sessionId}:`, error);
            session.isConnected = false;
            session.updatedAt = new Date().toISOString();
            return false;
        }
    }

    // 停止Telegram会话
    async stopSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session || !session.client) {
            return false;
        }

        try {
            await session.client.disconnect();
            session.isConnected = false;
            session.updatedAt = new Date().toISOString();
            console.log(`Telegram session ${sessionId} stopped`);
            return true;
        } catch (error) {
            console.error(`Failed to stop Telegram session ${sessionId}:`, error);
            return false;
        }
    }

    // 发送消息
    async sendMessage(sessionId: string, toUserId: string, message: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session?.client || !session.isConnected) {
            throw new Error(`Session ${sessionId} not connected`);
        }

        try {
            await session.client.sendMessage(toUserId, { message });

            // 保存消息到数据库
            const telegramMessage: TelegramMessage = {
                id: `telegram_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                sessionId,
                fromUserId: session.userId || 'unknown',
                fromUserName: session.phoneNumber || 'Telegram User',
                toUserId,
                messageText: message,
                messageType: 'text',
                timestamp: new Date().toISOString(),
                isFromBot: false,
                isRead: true,
                deliveryStatus: 'sent',
                metadata: {
                    platform: 'telegram'
                }
            };

            await this.saveMessageToDatabase(telegramMessage);
            console.log(`Message sent to ${toUserId}: ${message}`);
            return true;
        } catch (error) {
            console.error(`Failed to send message via Telegram session ${sessionId}:`, error);
            return false;
        }
    }

    // 获取会话状态
    getSessionStatus(sessionId: string): TelegramSession | null {
        return this.sessions.get(sessionId) || null;
    }

    // 获取所有会话
    getAllSessions(): TelegramSession[] {
        return Array.from(this.sessions.values());
    }

    // 删除会话
    async deleteSession(sessionId: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (session) {
            if (session.isConnected && session.client) {
                await this.stopSession(sessionId);
            }
            this.sessions.delete(sessionId);
            console.log(`Telegram session ${sessionId} deleted`);
            return true;
        }
        return false;
    }

    // 设置消息处理器
    private setupMessageHandlers(client: TelegramClient, sessionId: string) {
        // 监听新消息
        client.addEventHandler(async (event: NewMessageEvent) => {
            try {
                const message = event.message;

                // 忽略自己发送的消息
                if (message.out) {
                    return;
                }

                const telegramMessage: TelegramMessage = {
                    id: `telegram_${message.id}_${sessionId}`,
                    sessionId,
                    fromUserId: message.senderId?.toString() || 'unknown',
                    fromUserName: await this.getSenderName(client, message),
                    toUserId: sessionId,
                    messageText: message.text || '',
                    messageType: this.getMessageType(message),
                    timestamp: new Date(message.date * 1000).toISOString(),
                    isFromBot: false,
                    isRead: false,
                    deliveryStatus: 'delivered',
                    metadata: {
                        platform: 'telegram',
                        rawMessage: message,
                        replyToMessageId: message.replyToMsgId?.toString(),
                        isGroupMessage: !!message.chat,
                        groupName: (message.chat as any)?.title || ''
                    }
                };

                // 保存消息到数据库
                await this.saveMessageToDatabase(telegramMessage);

                console.log(`Received Telegram message from ${telegramMessage.fromUserName}: ${telegramMessage.messageText}`);

                // 触发自动回复逻辑
                await this.handleAutoReply(client, sessionId, telegramMessage);

            } catch (error) {
                console.error('Error handling Telegram message:', error);
            }
        }, new NewMessage({}));
    }


    // 保存消息到数据库
    private async saveMessageToDatabase(message: TelegramMessage) {
        try {
            // 保存到本地数据库
            await this.database.addMessage({
                sessionId: message.sessionId,
                content: message.messageText,
                isFromBot: message.isFromBot,
                fromUser: message.fromUserId,
                toUser: message.toUserId,
                channelId: `telegram_${message.sessionId}`,
                timestamp: new Date(message.timestamp),
            });

            // 保存到Firestore
            const firestoreMessage = {
                id: message.id,
                conversationId: `telegram_${message.sessionId}_${message.fromUserId}`,
                channelId: `telegram_${message.sessionId}`,
                from: message.isFromBot ? 'agent' as const : 'customer' as const,
                to: message.toUserId,
                fromUser: message.fromUserId,
                text: message.messageText,
                timestamp: message.timestamp,
                messageType: message.messageType as any,
                metadata: message.metadata,
                read: message.isRead,
                createdAt: new Date().toISOString(),
            };

            await firestoreService.saveMessage(firestoreMessage);

        } catch (error) {
            console.error('Failed to save Telegram message to database:', error);
        }
    }

    // 辅助方法
    private async getPassword(): Promise<string> {
        // 在实际应用中，这里应该从用户输入或配置中获取密码
        return process.env.TELEGRAM_PASSWORD || '';
    }

    private async getPhoneCode(): Promise<string> {
        // 在实际应用中，这里应该从用户输入获取验证码
        // 这里返回一个空字符串，实际使用时需要实现输入机制
        return '';
    }

    private async getSenderName(client: TelegramClient, message: any): Promise<string> {
        try {
            if (message.sender) {
                return message.sender.firstName || message.sender.username || 'Unknown User';
            }
            return 'Unknown User';
        } catch (error) {
            return 'Unknown User';
        }
    }

    private getMessageType(message: any): TelegramMessage['messageType'] {
        if (message.media) {
            if (message.media.className?.includes('Photo')) return 'image';
            if (message.media.className?.includes('Video')) return 'video';
            if (message.media.className?.includes('Document')) return 'document';
            if (message.media.className?.includes('Voice')) return 'voice';
        }
        return 'text';
    }

    // 会话持久化方法
    private async loadSessionsFromStorage() {
        try {
            // 从本地存储加载会话
            const storedSessions = localStorage?.getItem('telegram_sessions');
            if (storedSessions) {
                const sessions: TelegramSession[] = JSON.parse(storedSessions);
                sessions.forEach(session => {
                    this.sessions.set(session.id, session);
                    // 默认启用自动回复
                    this.autoReplyEnabled.set(session.id, true);
                });
                console.log(`Loaded ${sessions.length} Telegram sessions from storage`);
            }
        } catch (error) {
            console.error('Failed to load Telegram sessions from storage:', error);
        }
    }

    private async saveSessionsToStorage() {
        try {
            const sessions = Array.from(this.sessions.values());
            localStorage?.setItem('telegram_sessions', JSON.stringify(sessions));
        } catch (error) {
            console.error('Failed to save Telegram sessions to storage:', error);
        }
    }

    // 自动回复开关方法
    setAutoReply(sessionId: string, enabled: boolean): void {
        this.autoReplyEnabled.set(sessionId, enabled);
        console.log(`Auto-reply for session ${sessionId} ${enabled ? 'enabled' : 'disabled'}`);
    }

    getAutoReplyStatus(sessionId: string): boolean {
        return this.autoReplyEnabled.get(sessionId) || false;
    }

    // 同步聊天记录到inbox
    async syncChatHistory(sessionId: string, limit: number = 50): Promise<number> {
        const session = this.sessions.get(sessionId);
        if (!session?.client || !session.isConnected) {
            throw new Error(`Session ${sessionId} not connected`);
        }

        try {
            console.log(`Starting chat history sync for session ${sessionId}, limit: ${limit}`);

            // 获取对话列表
            const dialogs = await session.client.getDialogs({ limit });
            let totalMessages = 0;

            for (const dialog of dialogs) {
                if (dialog.entity && dialog.entity.className === 'User') {
                    const userId = dialog.entity.id.toString();
                    const userName = dialog.entity.firstName || dialog.entity.username || 'Unknown User';

                    // 获取对话历史
                    const messages = await session.client.getMessages(dialog.entity, { limit: 20 });

                    for (const message of messages) {
                        if (message.text) {
                            const telegramMessage: TelegramMessage = {
                                id: `telegram_${message.id}_${sessionId}`,
                                sessionId,
                                fromUserId: message.senderId?.toString() || 'unknown',
                                fromUserName: userName,
                                toUserId: sessionId,
                                messageText: message.text,
                                messageType: this.getMessageType(message),
                                timestamp: new Date(message.date * 1000).toISOString(),
                                isFromBot: false,
                                isRead: true,
                                deliveryStatus: 'delivered',
                                metadata: {
                                    platform: 'telegram',
                                    rawMessage: message,
                                    isGroupMessage: false
                                }
                            };

                            await this.saveMessageToDatabase(telegramMessage);
                            totalMessages++;
                        }
                    }
                }
            }

            console.log(`Synced ${totalMessages} messages from Telegram session ${sessionId}`);
            return totalMessages;
        } catch (error) {
            console.error(`Failed to sync chat history for session ${sessionId}:`, error);
            throw error;
        }
    }

    // 改进的自动回复处理
    private async handleAutoReply(client: TelegramClient, sessionId: string, message: TelegramMessage) {
        try {
            // 检查自动回复是否启用
            if (!this.getAutoReplyStatus(sessionId)) {
                return;
            }

            const session = this.sessions.get(sessionId);
            if (!session) return;

            // 调用AI服务生成回复，传递用户名
            const aiResponse = await this.generateAIResponse(message.messageText, sessionId, message.fromUserName);
            if (aiResponse) {
                await this.sendMessage(sessionId, message.fromUserId, aiResponse);

                // 记录AI回复
                const aiMessage: TelegramMessage = {
                    id: `telegram_ai_${Date.now()}_${sessionId}`,
                    sessionId,
                    fromUserId: session.userId || 'unknown',
                    fromUserName: session.phoneNumber || 'Telegram User',
                    toUserId: message.fromUserId,
                    messageText: aiResponse,
                    messageType: 'text',
                    timestamp: new Date().toISOString(),
                    isFromBot: true,
                    isRead: true,
                    deliveryStatus: 'sent',
                    metadata: {
                        platform: 'telegram',
                        aiAgent: {
                            id: this.getBoundAgent(sessionId) || 'default-ai-agent',
                            responseGenerated: true
                        }
                    }
                };

                await this.saveMessageToDatabase(aiMessage);
            }

        } catch (error) {
            console.error('Error in auto-reply:', error);
        }
    }

    // 智能体绑定方法
    bindAgent(sessionId: string, agentId: string): void {
        this.agentBindings.set(sessionId, agentId);
        console.log(`Agent ${agentId} bound to Telegram session ${sessionId}`);
    }

    unbindAgent(sessionId: string): void {
        this.agentBindings.delete(sessionId);
        console.log(`Agent unbound from Telegram session ${sessionId}`);
    }

    getBoundAgent(sessionId: string): string | null {
        return this.agentBindings.get(sessionId) || null;
    }

    // AI回复生成方法 - 使用智能体的prompt和角色
    private async generateAIResponse(message: string, sessionId: string, fromUserName: string = 'Telegram User'): Promise<string | null> {
        try {
            const boundAgentId = this.getBoundAgent(sessionId);

            if (boundAgentId) {
                // 使用绑定的智能体生成回复
                const aiAgentManager = getAIAgentManager();

                // 创建完整的消息对象
                const conversationMessage = {
                    id: `telegram_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                    channelId: `telegram_${sessionId}`,
                    conversationId: `telegram_${sessionId}_${fromUserName}`,
                    fromUser: fromUserName,
                    fromUserName: fromUserName,
                    toUser: sessionId,
                    messageText: message,
                    messageType: 'text' as const,
                    timestamp: new Date(),
                    isFromBot: false,
                    isRead: false,
                    deliveryStatus: 'delivered' as const,
                    metadata: {
                        platform: 'telegram'
                    }
                };

                const response = await aiAgentManager.generateResponse(boundAgentId, conversationMessage);
                if (response) {
                    return response;
                }
            }

            // 如果没有绑定智能体或智能体没有回复，使用默认回复
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
                return "Hello! I'm an AI assistant. How can I help you today?";
            }
            if (lowerMessage.includes('help')) {
                return "I'm here to help! What do you need assistance with?";
            }
            if (lowerMessage.includes('thank')) {
                return "You're welcome! Is there anything else I can help you with?";
            }

            // 默认回复
            return "Thank you for your message. I'm an AI assistant and will get back to you shortly.";

        } catch (error) {
            console.error('Error generating AI response:', error);
            return null;
        }
    }

    // 更新会话保存逻辑
    async updateSession(sessionId: string, updates: Partial<TelegramSession>): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }

        Object.assign(session, updates);
        session.updatedAt = new Date().toISOString();
        await this.saveSessionsToStorage();
        return true;
    }
}

// 单例实例
let telegramManager: TelegramClientManager;

export function getTelegramManager(): TelegramClientManager {
    if (!telegramManager) {
        telegramManager = new TelegramClientManager();
    }
    return telegramManager;
}

export default TelegramClientManager;
