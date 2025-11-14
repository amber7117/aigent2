// Connection Status Monitor for all channels

import { getDatabase, PersistedChannel, ChannelConnection } from './database';
import { getWhatsAppManager } from './whatsapp-client';

interface ConnectionHealth {
    channelId: string;
    status: 'healthy' | 'warning' | 'critical' | 'offline';
    lastHeartbeat: Date;
    errorCount: number;
    consecutiveErrors: number;
    averageResponseTime: number;
    uptime: number;
}

class ConnectionMonitor {
    private monitoringInterval: NodeJS.Timeout | null = null;
    private readonly CHECK_INTERVAL = 30000; // 30 seconds
    private readonly MAX_CONSECUTIVE_ERRORS = 3;
    private readonly HEARTBEAT_TIMEOUT = 60000; // 1 minute

    private healthStatus = new Map<string, ConnectionHealth>();

    // Start monitoring all active connections
    startMonitoring(): void {
        if (this.monitoringInterval) {
            return; // Already monitoring
        }

        console.log('Starting connection monitoring...');
        this.monitoringInterval = setInterval(() => {
            this.checkAllConnections();
        }, this.CHECK_INTERVAL);

        // Initial check
        this.checkAllConnections();
    }

    // Stop monitoring
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Connection monitoring stopped');
        }
    }

    // Check all active connections
    private async checkAllConnections(): Promise<void> {
        try {
            const database = getDatabase();
            const activeChannels = await database.getActiveChannels();

            console.log(`Checking ${activeChannels.length} active connections...`);

            for (const channel of activeChannels) {
                await this.checkChannelConnection(channel);
            }

            // Clean up old health status for inactive channels
            this.cleanupHealthStatus(activeChannels);

        } catch (error) {
            console.error('Failed to check connections:', error);
        }
    }

    // Check individual channel connection
    private async checkChannelConnection(channel: PersistedChannel): Promise<void> {
        try {
            const database = getDatabase();
            let connectionStatus: ChannelConnection | null = await database.getConnectionStatus(channel.id);

            if (!connectionStatus) {
                // Initialize connection status
                connectionStatus = {
                    id: `conn_${channel.id}_${Date.now()}`,
                    channelId: channel.id,
                    status: 'connected',
                    connectionDetails: {
                        connectionTime: new Date(),
                        lastHeartbeat: new Date(),
                        errorCount: 0,
                        lastError: undefined
                    },
                    statistics: {
                        messagesReceived: 0,
                        messagesSent: 0,
                        autoRepliesSent: 0,
                        uptime: 0,
                        lastActivity: new Date()
                    }
                };
                await database.updateConnectionStatus(channel.id, connectionStatus);
            }

            // Perform health check based on channel type
            const healthResult = await this.performHealthCheck(channel);

            // Update health status
            this.updateHealthStatus(channel.id, healthResult, connectionStatus);

            // Update connection status in database
            connectionStatus.connectionDetails.lastHeartbeat = new Date();
            connectionStatus.connectionDetails.errorCount = healthResult.errorCount;
            connectionStatus.status = healthResult.isHealthy ? 'connected' :
                (healthResult.errorCount > 0 ? 'error' : 'disconnected');

            if (!healthResult.isHealthy && healthResult.error) {
                connectionStatus.connectionDetails.lastError = healthResult.error;
            }

            await database.updateConnectionStatus(channel.id, connectionStatus);

            // Handle connection issues
            if (!healthResult.isHealthy) {
                await this.handleConnectionIssue(channel, healthResult);
            }

        } catch (error) {
            console.error(`Failed to check connection for channel ${channel.id}:`, error);
        }
    }

    // Perform health check for specific channel type
    private async performHealthCheck(channel: PersistedChannel): Promise<{
        isHealthy: boolean;
        responseTime: number;
        errorCount: number;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            switch (channel.type) {
                case 'WhatsApp':
                    return await this.checkWhatsAppHealth(channel);
                case 'WeChat':
                    return await this.checkWeChatHealth(channel);
                default:
                    return {
                        isHealthy: true,
                        responseTime: Date.now() - startTime,
                        errorCount: 0
                    };
            }
        } catch (error) {
            return {
                isHealthy: false,
                responseTime: Date.now() - startTime,
                errorCount: 1,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Check WhatsApp connection health
    private async checkWhatsAppHealth(channel: PersistedChannel): Promise<{
        isHealthy: boolean;
        responseTime: number;
        errorCount: number;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            const whatsappManager = getWhatsAppManager();
            const sessionInfo = whatsappManager.getSessionInfo(channel.connectionData.sessionId!);

            if (!sessionInfo) {
                return {
                    isHealthy: false,
                    responseTime: Date.now() - startTime,
                    errorCount: 1,
                    error: 'Session not found'
                };
            }

            if (!sessionInfo.isConnected) {
                return {
                    isHealthy: false,
                    responseTime: Date.now() - startTime,
                    errorCount: 1,
                    error: 'WhatsApp session disconnected'
                };
            }

            // Check if session is responsive (can send a ping)
            // In a real implementation, you might send a test message or check socket state
            const isResponsive = true; // Placeholder - implement actual check

            return {
                isHealthy: isResponsive,
                responseTime: Date.now() - startTime,
                errorCount: isResponsive ? 0 : 1,
                error: isResponsive ? undefined : 'Session not responsive'
            };

        } catch (error) {
            return {
                isHealthy: false,
                responseTime: Date.now() - startTime,
                errorCount: 1,
                error: error instanceof Error ? error.message : 'WhatsApp health check failed'
            };
        }
    }

    // Check WeChat connection health
    private async checkWeChatHealth(channel: PersistedChannel): Promise<{
        isHealthy: boolean;
        responseTime: number;
        errorCount: number;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            // Placeholder for WeChat health check
            // In a real implementation, check WeChat API connection

            return {
                isHealthy: channel.isConnected,
                responseTime: Date.now() - startTime,
                errorCount: 0
            };

        } catch (error) {
            return {
                isHealthy: false,
                responseTime: Date.now() - startTime,
                errorCount: 1,
                error: error instanceof Error ? error.message : 'WeChat health check failed'
            };
        }
    }

    // Update health status tracking
    private updateHealthStatus(
        channelId: string,
        healthResult: { isHealthy: boolean; responseTime: number; errorCount: number; error?: string },
        connectionStatus: ChannelConnection
    ): void {
        let health = this.healthStatus.get(channelId);

        if (!health) {
            health = {
                channelId,
                status: 'healthy',
                lastHeartbeat: new Date(),
                errorCount: 0,
                consecutiveErrors: 0,
                averageResponseTime: 0,
                uptime: 0
            };
        }

        // Update health metrics
        health.lastHeartbeat = new Date();

        if (healthResult.isHealthy) {
            health.consecutiveErrors = 0;
            health.status = 'healthy';
        } else {
            health.errorCount += healthResult.errorCount;
            health.consecutiveErrors += 1;

            // Determine status based on consecutive errors
            if (health.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
                health.status = 'critical';
            } else if (health.consecutiveErrors >= 2) {
                health.status = 'warning';
            } else {
                health.status = 'warning';
            }
        }

        // Update average response time
        health.averageResponseTime = (health.averageResponseTime + healthResult.responseTime) / 2;

        // Calculate uptime
        const connectionTime = connectionStatus.connectionDetails.connectionTime;
        health.uptime = Date.now() - connectionTime.getTime();

        this.healthStatus.set(channelId, health);

        console.log(`Health update for ${channelId}: ${health.status} (errors: ${health.consecutiveErrors})`);
    }

    // Handle connection issues
    private async handleConnectionIssue(
        channel: PersistedChannel,
        healthResult: { isHealthy: boolean; errorCount: number; error?: string }
    ): Promise<void> {
        const health = this.healthStatus.get(channel.id);

        if (!health) return;

        console.log(`Connection issue detected for ${channel.id}: ${healthResult.error}`);

        // Try to reconnect if critical
        if (health.status === 'critical' && channel.type === 'WhatsApp') {
            await this.attemptReconnection(channel);
        }

        // Update channel status in database
        const database = getDatabase();

        if (health.status === 'critical') {
            await database.updateChannelStatus(channel.id, 'error');
        } else if (health.status === 'warning') {
            await database.updateChannelStatus(channel.id, 'connecting');
        }
    }

    // Attempt to reconnect a channel
    private async attemptReconnection(channel: PersistedChannel): Promise<void> {
        try {
            console.log(`Attempting to reconnect channel: ${channel.id}`);

            if (channel.type === 'WhatsApp') {
                const whatsappManager = getWhatsAppManager();

                // Try to create a new session
                const result = await whatsappManager.createSession(channel.connectionData.sessionId!);

                if (result.success) {
                    console.log(`Successfully reconnected WhatsApp channel: ${channel.id}`);

                    // Reset health status
                    const health = this.healthStatus.get(channel.id);
                    if (health) {
                        health.consecutiveErrors = 0;
                        health.status = 'healthy';
                        this.healthStatus.set(channel.id, health);
                    }

                    // Update database
                    const database = getDatabase();
                    await database.updateChannelStatus(channel.id, 'online');

                } else {
                    console.error(`Failed to reconnect WhatsApp channel: ${result.error}`);
                }
            }

        } catch (error) {
            console.error(`Reconnection attempt failed for ${channel.id}:`, error);
        }
    }

    // Clean up health status for inactive channels
    private cleanupHealthStatus(activeChannels: PersistedChannel[]): void {
        const activeChannelIds = new Set(activeChannels.map(c => c.id));

        for (const [channelId] of this.healthStatus) {
            if (!activeChannelIds.has(channelId)) {
                this.healthStatus.delete(channelId);
                console.log(`Cleaned up health status for inactive channel: ${channelId}`);
            }
        }
    }

    // Get health status for a specific channel
    getChannelHealth(channelId: string): ConnectionHealth | null {
        return this.healthStatus.get(channelId) || null;
    }

    // Get health status for all channels
    getAllChannelHealth(): Map<string, ConnectionHealth> {
        return new Map(this.healthStatus);
    }

    // Get summary statistics
    getHealthSummary(): {
        total: number;
        healthy: number;
        warning: number;
        critical: number;
        offline: number;
    } {
        const summary = {
            total: this.healthStatus.size,
            healthy: 0,
            warning: 0,
            critical: 0,
            offline: 0
        };

        for (const health of this.healthStatus.values()) {
            summary[health.status]++;
        }

        return summary;
    }
}

// Singleton instance
let connectionMonitor: ConnectionMonitor;

export function getConnectionMonitor(): ConnectionMonitor {
    if (!connectionMonitor) {
        connectionMonitor = new ConnectionMonitor();
        // Auto-start monitoring
        connectionMonitor.startMonitoring();
    }
    return connectionMonitor;
}

export type { ConnectionHealth };