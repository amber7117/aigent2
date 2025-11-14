// Database models for persistent channel connections, messages, and AI agents

export interface PersistedChannel {
    id: string;
    name: string;
    type: 'WhatsApp' | 'WeChat' | 'Telegram' | 'Facebook' | 'Instagram';
    status: 'online' | 'offline' | 'error' | 'connecting';
    connectionData: {
        sessionId?: string; // For WhatsApp Bailey sessions
        phoneNumber?: string;
        userName?: string;
        authToken?: string; // For other platforms
        webhookUrl?: string;
        apiKey?: string;
    };
    agentId?: string; // Associated AI agent
    autoReply: boolean;
    settings: {
        replyDelay?: number; // Delay before auto-reply (seconds)
        replyProbability?: number; // Chance of auto-reply (0-1)
        businessHours?: {
            enabled: boolean;
            timezone: string;
            schedule: Array<{
                day: string;
                start: string;
                end: string;
            }>;
        };
    };
    createdAt: Date;
    updatedAt: Date;
    lastActivity: Date;
    isConnected: boolean;
    connectionRetries: number;
}

export interface ConversationMessage {
    id: string;
    channelId: string;
    conversationId: string; // Group messages by conversation
    fromUser: string; // Phone number or user ID
    fromUserName?: string;
    toUser: string;
    messageText: string;
    messageType: 'text' | 'image' | 'video' | 'document' | 'voice' | 'location' | 'contact';
    mediaUrl?: string;
    timestamp: Date;
    isFromBot: boolean; // True if sent by AI agent
    isRead: boolean;
    deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed';
    metadata: {
        platform: string;
        rawMessage?: any; // Original message object from platform
        replyToMessageId?: string;
        isGroupMessage?: boolean;
        groupName?: string;
        aiAgent?: {
            id: string;
            responseGenerated: boolean;
            agentName?: string;
            provider?: string;
            model?: string;
        };
        isAutoReply?: boolean;
    };
}

export interface AIAgentPrompt {
    id: string;
    agentId: string;
    name: string;
    prompt: string;
    triggerWords?: string[]; // Keywords that trigger this prompt
    priority: number; // Higher priority prompts are checked first
    isActive: boolean;
    conditions: {
        messageType?: string[];
        timeOfDay?: { start: string; end: string };
        userType?: 'new' | 'returning' | 'vip';
        sentiment?: 'positive' | 'negative' | 'neutral';
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface AIAgentResponse {
    id: string;
    agentId: string;
    promptId: string;
    channelId: string;
    conversationId: string;
    originalMessageId: string;
    responseText: string;
    responseTime: number; // Time taken to generate response (ms)
    confidence: number; // AI confidence score (0-1)
    wasUsed: boolean; // Whether the response was actually sent
    createdAt: Date;
}

export interface ChannelConnection {
    id: string;
    channelId: string;
    status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
    connectionDetails: {
        sessionId?: string;
        connectionTime: Date;
        lastHeartbeat: Date;
        errorCount: number;
        lastError?: string;
    };
    statistics: {
        messagesReceived: number;
        messagesSent: number;
        autoRepliesSent: number;
        uptime: number; // In seconds
        lastActivity: Date;
    };
}

// Database operations interface
export interface DatabaseOperations {
    // Channel operations
    saveChannel(channel: PersistedChannel): Promise<PersistedChannel>;
    getChannel(id: string): Promise<PersistedChannel | null>;
    updateChannelStatus(id: string, status: PersistedChannel['status']): Promise<void>;
    updateChannelConnection(id: string, connectionData: any): Promise<void>;
    getActiveChannels(): Promise<PersistedChannel[]>;

    // Message operations
    saveMessage(message: ConversationMessage): Promise<ConversationMessage>;
    getConversationMessages(conversationId: string, limit?: number): Promise<ConversationMessage[]>;
    getChannelMessages(channelId: string, limit?: number): Promise<ConversationMessage[]>;
    markMessagesAsRead(conversationId: string): Promise<void>;
    getRecentMessages(sessionId: string, limit?: number): Promise<ConversationMessage[]>;
    addMessage(messageData: {
        sessionId: string;
        content: string;
        isFromBot: boolean;
        fromUser: string;
        toUser: string;
        channelId?: string;
        agentId?: string;
        timestamp: Date;
    }): Promise<ConversationMessage>;

    // AI Agent operations
    getAgentPrompts(agentId: string): Promise<AIAgentPrompt[]>;
    saveAgentResponse(response: AIAgentResponse): Promise<void>;
    getAgentStatistics(agentId: string): Promise<any>;
    getAllAIAgents(): Promise<any[]>;

    // Connection monitoring
    updateConnectionStatus(channelId: string, connection: ChannelConnection): Promise<void>;
    getConnectionStatus(channelId: string): Promise<ChannelConnection | null>;
}

// Simple in-memory database implementation (can be replaced with real database)
class InMemoryDatabase implements DatabaseOperations {
    private channels = new Map<string, PersistedChannel>();
    private messages = new Map<string, ConversationMessage>();
    private agentPrompts = new Map<string, AIAgentPrompt[]>();
    private agentResponses = new Map<string, AIAgentResponse>();
    private connections = new Map<string, ChannelConnection>();

    async saveChannel(channel: PersistedChannel): Promise<PersistedChannel> {
        channel.updatedAt = new Date();
        this.channels.set(channel.id, channel);
        console.log(`Channel saved: ${channel.name} (${channel.type})`);
        return channel;
    }

    async getChannel(id: string): Promise<PersistedChannel | null> {
        return this.channels.get(id) || null;
    }

    async updateChannelStatus(id: string, status: PersistedChannel['status']): Promise<void> {
        const channel = this.channels.get(id);
        if (channel) {
            channel.status = status;
            channel.updatedAt = new Date();
            if (status === 'online') {
                channel.isConnected = true;
                channel.lastActivity = new Date();
            } else {
                channel.isConnected = false;
            }
            this.channels.set(id, channel);
            console.log(`Channel ${id} status updated to: ${status}`);
        }
    }

    async updateChannelConnection(id: string, connectionData: any): Promise<void> {
        const channel = this.channels.get(id);
        if (channel) {
            channel.connectionData = { ...channel.connectionData, ...connectionData };
            channel.updatedAt = new Date();
            this.channels.set(id, channel);
            console.log(`Channel ${id} connection data updated`);
        }
    }

    async getActiveChannels(): Promise<PersistedChannel[]> {
        return Array.from(this.channels.values()).filter(channel => channel.isConnected);
    }

    async saveMessage(message: ConversationMessage): Promise<ConversationMessage> {
        this.messages.set(message.id, message);
        console.log(`Message saved: ${message.id} from ${message.fromUser}`);

        // Update channel last activity
        await this.updateChannelStatus(message.channelId, 'online');

        return message;
    }

    async getConversationMessages(conversationId: string, limit = 50): Promise<ConversationMessage[]> {
        const messages = Array.from(this.messages.values())
            .filter(msg => msg.conversationId === conversationId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
        return messages;
    }

    async getChannelMessages(channelId: string, limit = 50): Promise<ConversationMessage[]> {
        const messages = Array.from(this.messages.values())
            .filter(msg => msg.channelId === channelId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
        return messages;
    }

    async markMessagesAsRead(conversationId: string): Promise<void> {
        for (const [id, message] of this.messages) {
            if (message.conversationId === conversationId && !message.isRead) {
                message.isRead = true;
                this.messages.set(id, message);
            }
        }
    }

    async getRecentMessages(sessionId: string, limit: number = 10): Promise<ConversationMessage[]> {
        const messages = Array.from(this.messages.values())
            .filter(msg => msg.conversationId === sessionId || msg.channelId === sessionId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit)
            .reverse(); // Return in chronological order
        return messages;
    }

    async addMessage(messageData: {
        sessionId: string;
        content: string;
        isFromBot: boolean;
        fromUser: string;
        toUser: string;
        channelId?: string;
        agentId?: string;
        timestamp: Date;
    }): Promise<ConversationMessage> {
        const message: ConversationMessage = {
            id: generateMessageId(),
            channelId: messageData.channelId || messageData.sessionId,
            conversationId: messageData.sessionId,
            fromUser: messageData.fromUser,
            fromUserName: messageData.fromUser,
            toUser: messageData.toUser,
            messageText: messageData.content,
            messageType: 'text',
            timestamp: messageData.timestamp,
            isFromBot: messageData.isFromBot,
            isRead: false,
            deliveryStatus: 'sent',
            metadata: {
                platform: 'AI_Agent',
                aiAgent: messageData.agentId ? {
                    id: messageData.agentId,
                    responseGenerated: messageData.isFromBot
                } : undefined
            }
        };

        this.messages.set(message.id, message);
        console.log(`Message added: ${message.id} from ${messageData.fromUser}`);
        return message;
    }

    async getAgentPrompts(agentId: string): Promise<AIAgentPrompt[]> {
        return this.agentPrompts.get(agentId) || [];
    }

    async getAllAIAgents(): Promise<any[]> {
        // For now, return a simple agent list 
        // In a real app this would fetch from agents table
        return [
            { id: 'agent-1', name: '客服助手', prompt: '你是一个专业的客服助手...', provider: 'Gemini', model: 'gemini-1.5-flash' },
            { id: 'agent-2', name: '销售顾问', prompt: '你是一个专业的销售顾问...', provider: 'OpenAI', model: 'gpt-4' },
        ];
    }

    async saveAgentResponse(response: AIAgentResponse): Promise<void> {
        this.agentResponses.set(response.id, response);
        console.log(`AI response saved: ${response.id} for agent ${response.agentId}`);
    }

    async getAgentStatistics(agentId: string): Promise<any> {
        const responses = Array.from(this.agentResponses.values())
            .filter(response => response.agentId === agentId);

        return {
            totalResponses: responses.length,
            responsesUsed: responses.filter(r => r.wasUsed).length,
            averageResponseTime: responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length || 0,
            averageConfidence: responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length || 0,
        };
    }

    async updateConnectionStatus(channelId: string, connection: ChannelConnection): Promise<void> {
        this.connections.set(channelId, connection);
        console.log(`Connection status updated for channel ${channelId}: ${connection.status}`);
    }

    async getConnectionStatus(channelId: string): Promise<ChannelConnection | null> {
        return this.connections.get(channelId) || null;
    }
}

// Singleton database instance
let database: DatabaseOperations;

export function getDatabase(): DatabaseOperations {
    if (!database) {
        database = new InMemoryDatabase();
    }
    return database;
}

// Utility functions
export function createConversationId(channelId: string, userIdentifier: string): string {
    return `${channelId}_${userIdentifier}`;
}

export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

let channelIdCounter = Math.floor(Math.random() * 10000);

export function generateChannelId(type: string, identifier: string): string {
    channelIdCounter++;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const processId = typeof process !== 'undefined' ? (process.pid || 0) : Math.floor(Math.random() * 1000);
    return `${type.toLowerCase()}_${identifier}_${timestamp}_${channelIdCounter}_${random}_${processId}`;
}
