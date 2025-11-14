import makeWASocket, {
    ConnectionState,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    WAMessageKey,
    WAMessageUpdate,
    AuthenticationState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import {
    getDatabase,
    PersistedChannel,
    ConversationMessage,
    createConversationId,
    generateMessageId,
    generateChannelId
} from './database';
import { getAIAgentManager } from './ai-agent-manager';
import { firestoreService } from './firestore-service'; interface WhatsAppSession {
    id: string;
    socket?: ReturnType<typeof makeWASocket>;
    state: AuthenticationState;
    qrCode?: string;
    isConnected: boolean;
    phoneNumber?: string;
    name?: string;
}

class WhatsAppClientManager {
    private sessions: Map<string, WhatsAppSession> = new Map();
    private logger = pino({ level: 'warn' }); // Reduce log noise

    async createSession(sessionId: string): Promise<{ qr?: string; success: boolean; error?: string }> {
        try {
            console.log(`Creating WhatsApp session: ${sessionId}`);

            // Use multi-file auth state for session persistence
            const { state, saveCreds } = await useMultiFileAuthState(`./sessions/whatsapp_${sessionId}`);

            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(`Using WA version: ${version}, Latest: ${isLatest}`);

            // Create socket with proper configuration
            const socket = makeWASocket({
                version,
                logger: this.logger,
                printQRInTerminal: false, // We'll handle QR display ourselves
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger),
                },
                browser: ['OmniChat', 'Chrome', '118.0.0.0'], // Custom browser identifier
                generateHighQualityLinkPreview: true,
            });

            const session: WhatsAppSession = {
                id: sessionId,
                socket,
                state,
                isConnected: false,
            };

            this.sessions.set(sessionId, session);

            return new Promise((resolve) => {
                let resolved = false;

                // Handle QR code generation
                socket.ev.on('connection.update', async (update) => {
                    const { connection, lastDisconnect, qr } = update;

                    if (qr && !resolved) {
                        console.log('QR code generated for session:', sessionId);
                        session.qrCode = qr;
                        resolved = true;
                        resolve({ qr, success: true });
                    }

                    if (connection === 'close') {
                        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                        console.log('Connection closed:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect);

                        if (shouldReconnect) {
                            // Reconnect if not explicitly logged out
                            setTimeout(() => this.createSession(sessionId), 3000);
                        } else {
                            this.removeSession(sessionId);
                        }
                        session.isConnected = false;
                    } else if (connection === 'open') {
                        console.log('WhatsApp connection opened for session:', sessionId);
                        session.isConnected = true;
                        session.phoneNumber = socket.user?.id?.split(':')[0];
                        session.name = socket.user?.name;

                        // Save channel to database when successfully connected
                        await this.saveChannelToDatabase(sessionId, session);

                        if (!resolved) {
                            resolved = true;
                            resolve({ success: true });
                        }
                    }
                });

                // Save credentials when updated
                socket.ev.on('creds.update', saveCreds);

                // Handle incoming messages
                socket.ev.on('messages.upsert', async (m) => {
                    console.log('Received messages:', m.messages.length);
                    // Here you can process incoming messages and integrate with your chat system
                    for (const message of m.messages) {
                        await this.processIncomingMessage(sessionId, message);
                    }
                });

                // Timeout if QR not generated in 30 seconds
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve({ success: false, error: 'QR generation timeout' });
                    }
                }, 30000);
            });
        } catch (error) {
            console.error('Failed to create WhatsApp session:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    getSession(sessionId: string): WhatsAppSession | undefined {
        return this.sessions.get(sessionId);
    }

    isSessionConnected(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        return session?.isConnected || false;
    }

    async sendMessage(sessionId: string, to: string, message: string): Promise<boolean> {
        try {
            const session = this.sessions.get(sessionId);
            if (!session?.socket || !session.isConnected) {
                throw new Error('Session not connected');
            }

            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            await session.socket.sendMessage(jid, { text: message });
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    async disconnectSession(sessionId: string): Promise<boolean> {
        try {
            const session = this.sessions.get(sessionId);
            if (session?.socket) {
                await session.socket.logout();
                this.removeSession(sessionId);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to disconnect session:', error);
            return false;
        }
    }

    private removeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session?.socket) {
            // Remove specific listeners
            session.socket.ev.off('connection.update', () => { });
            session.socket.ev.off('messages.upsert', () => { });
            session.socket.ev.off('creds.update', () => { });
        }
        this.sessions.delete(sessionId);
    }

    // Get all active sessions
    getActiveSessions(): string[] {
        return Array.from(this.sessions.keys()).filter(sessionId =>
            this.isSessionConnected(sessionId)
        );
    }

    // Get session info
    getSessionInfo(sessionId: string): any {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return {
            id: session.id,
            isConnected: session.isConnected,
            phoneNumber: session.phoneNumber,
            name: session.name,
            qrCode: session.qrCode,
        };
    }

    // Save channel to database when connection is established
    private async saveChannelToDatabase(sessionId: string, session: WhatsAppSession): Promise<void> {
        try {
            const database = getDatabase();

            const channelData: PersistedChannel = {
                id: generateChannelId('whatsapp', sessionId),
                name: `WhatsApp - ${session.name || session.phoneNumber || 'Unknown'}`,
                type: 'WhatsApp',
                status: 'online',
                connectionData: {
                    sessionId: sessionId,
                    phoneNumber: session.phoneNumber,
                    userName: session.name,
                },
                agentId: undefined, // Will be set when user assigns an agent
                autoReply: false, // Default to false, user can enable
                settings: {
                    replyDelay: 2,
                    replyProbability: 1.0,
                    businessHours: {
                        enabled: false,
                        timezone: 'UTC',
                        schedule: []
                    }
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                isConnected: true,
                connectionRetries: 0
            };

            // Save to local database
            await database.saveChannel(channelData);
            console.log(`WhatsApp channel saved to local database: ${channelData.id}`);

            // Save to Firestore
            await firestoreService.saveChannel({
                id: channelData.id,
                name: channelData.name,
                type: 'WhatsApp',
                status: 'online',
                lastActivity: 'Just now',
                autoReply: channelData.autoReply,
                phoneNumber: session.phoneNumber,
                sessionId: sessionId,
                agentId: channelData.agentId,
            });

            // Load chat history from Firestore
            console.log(`Loading chat history for channel: ${channelData.id}`);
            const chatHistory = await firestoreService.getChatHistory(channelData.id);

            console.log(`Loaded ${chatHistory.conversations.length} conversations and messages for channel ${channelData.id}`);

            // You can process the chat history here if needed
            // For example, update local database with historical messages

        } catch (error) {
            console.error('Failed to save channel to database:', error);
        }
    }

    // Enhanced message processing with database storage and AI integration
    private async processIncomingMessage(sessionId: string, message: any): Promise<void> {
        try {
            const database = getDatabase();

            // Extract message details
            const fromUser = message.key.remoteJid;
            const isFromBot = message.key.fromMe;
            const messageText = message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                'Media message';

            const conversationId = createConversationId(sessionId, fromUser);

            // Create message object
            const conversationMessage: ConversationMessage = {
                id: generateMessageId(),
                channelId: sessionId,
                conversationId: conversationId,
                fromUser: fromUser,
                fromUserName: message.pushName || 'Unknown',
                toUser: isFromBot ? fromUser : (this.getSessionInfo(sessionId)?.phoneNumber || 'bot'),
                messageText: messageText,
                messageType: this.determineMessageType(message),
                timestamp: new Date(message.messageTimestamp * 1000),
                isFromBot: isFromBot,
                isRead: false,
                deliveryStatus: 'delivered',
                metadata: {
                    platform: 'WhatsApp',
                    rawMessage: message,
                    isGroupMessage: fromUser.includes('@g.us')
                }
            };

            // Save message to local database
            await database.saveMessage(conversationMessage);

            // Save message to Firestore
            const firestoreMessage = {
                id: conversationMessage.id,
                conversationId: conversationMessage.conversationId,
                channelId: sessionId,
                from: isFromBot ? ('bot' as const) : ('customer' as const),
                to: conversationMessage.toUser,
                fromUser: conversationMessage.fromUser,
                text: conversationMessage.messageText,
                timestamp: conversationMessage.timestamp.toISOString(),
                messageType: this.determineMessageType(message) as any,
                metadata: conversationMessage.metadata,
                read: conversationMessage.isRead,
                createdAt: new Date().toISOString(),
            };

            await firestoreService.saveMessage(firestoreMessage);

            // Create or update conversation in Firestore if it's a new customer message
            if (!isFromBot) {
                const existingConversations = await firestoreService.getConversationsByChannel(sessionId, 1);
                const existingConversation = existingConversations.find(c => c.customerPhone === fromUser);

                if (!existingConversation) {
                    await firestoreService.createConversationFromMessage(
                        sessionId,
                        fromUser,
                        message.pushName || 'Unknown Customer',
                        firestoreMessage
                    );
                }
            }

            // Only process AI responses for incoming messages (not sent by bot)
            if (!isFromBot) {
                await this.triggerAIResponse(sessionId, conversationMessage);
            }

            console.log(`WhatsApp message processed and saved: ${conversationMessage.id}`);

        } catch (error) {
            console.error('Failed to process incoming message:', error);
        }
    }

    // Determine message type from WhatsApp message object
    private determineMessageType(message: any): ConversationMessage['messageType'] {
        if (message.message?.conversation || message.message?.extendedTextMessage) return 'text';
        if (message.message?.imageMessage) return 'image';
        if (message.message?.videoMessage) return 'video';
        if (message.message?.documentMessage) return 'document';
        if (message.message?.audioMessage) return 'voice';
        if (message.message?.locationMessage) return 'location';
        if (message.message?.contactMessage) return 'contact';
        return 'text';
    }

    // Trigger AI agent response if enabled
    private async triggerAIResponse(sessionId: string, message: ConversationMessage): Promise<void> {
        try {
            const database = getDatabase();

            // Get channel information to check if auto-reply is enabled and agent is assigned
            const channel = await database.getChannel(sessionId);
            if (!channel || !channel.autoReply || !channel.agentId) {
                console.log(`AI auto-reply skipped for channel ${sessionId}: auto-reply disabled or no agent assigned`);
                return; // Auto-reply disabled or no agent assigned
            }

            console.log(`Triggering AI response for channel ${sessionId} with agent ${channel.agentId}`);

            // Call the AI agent response API
            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agents/response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message.messageText,
                    channelId: sessionId,
                    sessionId: message.conversationId,
                    fromUser: message.fromUser,
                    toUser: message.toUser
                }),
            });

            if (!response.ok) {
                console.error(`AI response API failed: ${response.status} ${response.statusText}`);
                return;
            }

            const aiResult = await response.json();
            if (!aiResult.success) {
                console.error('AI response generation failed:', aiResult.error);
                return;
            }

            const aiResponseText = aiResult.response;

            // Send AI response via WhatsApp
            const sent = await this.sendMessage(sessionId, message.fromUser, aiResponseText);

            if (sent) {
                console.log(`AI response sent successfully to ${message.fromUser}: ${aiResponseText}`);

                // Also save the sent message as a conversation message
                const botMessage: ConversationMessage = {
                    id: generateMessageId(),
                    channelId: sessionId,
                    conversationId: message.conversationId,
                    fromUser: this.getSessionInfo(sessionId)?.phoneNumber || 'bot',
                    fromUserName: 'AI Agent',
                    toUser: message.fromUser,
                    messageText: aiResponseText,
                    messageType: 'text',
                    timestamp: new Date(),
                    isFromBot: true,
                    isRead: true,
                    deliveryStatus: 'sent',
                    metadata: {
                        platform: 'WhatsApp',
                        isAutoReply: true,
                        aiAgent: {
                            id: channel.agentId,
                            responseGenerated: true,
                            agentName: aiResult.agentInfo?.name || 'Unknown Agent',
                            provider: aiResult.agentInfo?.provider || 'unknown',
                            model: aiResult.agentInfo?.model || 'unknown'
                        }
                    }
                };

                // Save bot message to local database
                await database.saveMessage(botMessage);

                // Save bot message to Firestore
                const firestoreBotMessage = {
                    id: botMessage.id,
                    conversationId: botMessage.conversationId,
                    channelId: sessionId,
                    from: 'bot' as const,
                    to: botMessage.toUser,
                    fromUser: botMessage.fromUser,
                    text: botMessage.messageText,
                    timestamp: botMessage.timestamp.toISOString(),
                    messageType: 'text' as any,
                    metadata: botMessage.metadata,
                    read: botMessage.isRead,
                    createdAt: new Date().toISOString(),
                };

                await firestoreService.saveMessage(firestoreBotMessage);
            } else {
                console.error(`Failed to send AI response to ${message.fromUser}`);
            }

        } catch (error) {
            console.error('Failed to trigger AI response:', error);
        }
    }
}

// Singleton instance
let whatsappManager: WhatsAppClientManager;

export function getWhatsAppManager(): WhatsAppClientManager {
    if (!whatsappManager) {
        whatsappManager = new WhatsAppClientManager();
    }
    return whatsappManager;
}

export type { WhatsAppSession };
