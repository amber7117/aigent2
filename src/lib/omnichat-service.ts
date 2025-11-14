// Service initialization for OmniChat platform

import { getConnectionMonitor } from './connection-monitor';
import { getAIAgentManager } from './ai-agent-manager';
import { getWhatsAppManager } from './whatsapp-client';
import { getDatabase } from './database';

class OmniChatService {
    private initialized = false;

    // Initialize all services
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        console.log('🚀 Initializing OmniChat services...');

        try {
            // 1. Initialize database
            console.log('📊 Initializing database...');
            const database = getDatabase();

            // 2. Initialize AI Agent Manager with default agents
            console.log('🤖 Initializing AI Agent Manager...');
            const aiAgentManager = getAIAgentManager();

            // 3. Initialize WhatsApp Manager
            console.log('📱 Initializing WhatsApp Manager...');
            const whatsappManager = getWhatsAppManager();

            // 4. Start connection monitoring
            console.log('🔍 Starting connection monitoring...');
            const connectionMonitor = getConnectionMonitor();

            // 5. Restore existing connections
            await this.restoreConnections();

            this.initialized = true;
            console.log('✅ OmniChat services initialized successfully!');

        } catch (error) {
            console.error('❌ Failed to initialize OmniChat services:', error);
            throw error;
        }
    }

    // Restore existing connections from database
    private async restoreConnections(): Promise<void> {
        try {
            const database = getDatabase();
            const activeChannels = await database.getActiveChannels();

            console.log(`🔄 Restoring ${activeChannels.length} active connections...`);

            for (const channel of activeChannels) {
                try {
                    await this.restoreChannelConnection(channel);
                } catch (error) {
                    console.error(`Failed to restore connection for channel ${channel.id}:`, error);
                    // Mark channel as error but continue with others
                    await database.updateChannelStatus(channel.id, 'error');
                }
            }

            console.log('✅ Connection restoration completed');

        } catch (error) {
            console.error('Failed to restore connections:', error);
        }
    }

    // Restore individual channel connection
    private async restoreChannelConnection(channel: any): Promise<void> {
        console.log(`Restoring ${channel.type} channel: ${channel.name}`);

        switch (channel.type) {
            case 'WhatsApp':
                await this.restoreWhatsAppConnection(channel);
                break;
            case 'WeChat':
                await this.restoreWeChatConnection(channel);
                break;
            default:
                console.log(`Connection restoration not implemented for ${channel.type}`);
        }
    }

    // Restore WhatsApp connection
    private async restoreWhatsAppConnection(channel: any): Promise<void> {
        try {
            const whatsappManager = getWhatsAppManager();
            const sessionId = channel.connectionData.sessionId;

            if (!sessionId) {
                throw new Error('No session ID found for WhatsApp channel');
            }

            // Check if session is already active
            const sessionInfo = whatsappManager.getSessionInfo(sessionId);

            if (sessionInfo && sessionInfo.isConnected) {
                console.log(`WhatsApp session ${sessionId} is already connected`);
                return;
            }

            // Try to restore the session from saved credentials
            const result = await whatsappManager.createSession(sessionId);

            if (result.success && !result.qr) {
                console.log(`✅ WhatsApp session ${sessionId} restored successfully`);

                // Update database
                const database = getDatabase();
                await database.updateChannelStatus(channel.id, 'online');

            } else if (result.qr) {
                console.log(`⚠️ WhatsApp session ${sessionId} needs QR scan`);

                // Update database to show that QR scan is needed
                const database = getDatabase();
                await database.updateChannelStatus(channel.id, 'offline');

            } else {
                throw new Error(result.error || 'Failed to restore session');
            }

        } catch (error) {
            console.error(`Failed to restore WhatsApp connection:`, error);

            // Update database
            const database = getDatabase();
            await database.updateChannelStatus(channel.id, 'error');
        }
    }

    // Restore WeChat connection
    private async restoreWeChatConnection(channel: any): Promise<void> {
        try {
            // For WeChat, we would check if the stored auth tokens are still valid
            // For now, just mark as offline since WeChat connections are typically session-based

            console.log(`⚠️ WeChat channel ${channel.name} needs manual reconnection`);

            const database = getDatabase();
            await database.updateChannelStatus(channel.id, 'offline');

        } catch (error) {
            console.error(`Failed to restore WeChat connection:`, error);

            const database = getDatabase();
            await database.updateChannelStatus(channel.id, 'error');
        }
    }

    // Get service status
    getStatus(): {
        initialized: boolean;
        services: {
            database: boolean;
            aiAgentManager: boolean;
            whatsappManager: boolean;
            connectionMonitor: boolean;
        };
    } {
        return {
            initialized: this.initialized,
            services: {
                database: true, // Database is always available (in-memory)
                aiAgentManager: this.initialized,
                whatsappManager: this.initialized,
                connectionMonitor: this.initialized,
            }
        };
    }

    // Shutdown services gracefully
    async shutdown(): Promise<void> {
        console.log('🛑 Shutting down OmniChat services...');

        try {
            // Stop connection monitoring
            const connectionMonitor = getConnectionMonitor();
            connectionMonitor.stopMonitoring();

            // Disconnect all WhatsApp sessions
            const whatsappManager = getWhatsAppManager();
            const activeSessions = whatsappManager.getActiveSessions();

            for (const sessionId of activeSessions) {
                await whatsappManager.disconnectSession(sessionId);
            }

            this.initialized = false;
            console.log('✅ OmniChat services shutdown completed');

        } catch (error) {
            console.error('❌ Error during service shutdown:', error);
        }
    }
}

// Singleton instance
let omniChatService: OmniChatService;

export function getOmniChatService(): OmniChatService {
    if (!omniChatService) {
        omniChatService = new OmniChatService();
    }
    return omniChatService;
}

// Auto-initialize when imported (for Next.js API routes)
export async function initializeOmniChat(): Promise<void> {
    const service = getOmniChatService();
    await service.initialize();
}

export type { OmniChatService };