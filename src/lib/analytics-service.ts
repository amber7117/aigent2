import { firestoreService } from './firestore-service';
import { getChannels } from './api';
import type { Channel } from './types';

export interface MessageAnalytics {
    totalMessages: number;
    totalConversations: number;
    messagesByChannel: Record<string, number>;
    messagesByHour: Record<string, number>;
    messagesByDay: Record<string, number>;
    responseTime: {
        average: number;
        median: number;
    };
    customerSatisfaction: number;
    busyHours: string[];
    topChannels: Array<{
        channelId: string;
        channelName: string;
        channelType: string;
        messageCount: number;
        responseTime: number;
    }>;
    dailyTrends: Array<{
        date: string;
        incoming: number;
        outgoing: number;
        total: number;
    }>;
}

export interface ChannelStats {
    channelId: string;
    channelName: string;
    channelType: string;
    totalMessages: number;
    incomingMessages: number;
    outgoingMessages: number;
    avgResponseTime: number;
    lastActivity: string;
    activeConversations: number;
}

export class AnalyticsService {
    private cache: Map<string, any> = new Map();
    private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

    private getCachedData(key: string): any {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    private setCachedData(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    async getOverallAnalytics(days: number = 30): Promise<MessageAnalytics> {
        const cacheKey = `overall_analytics_${days}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - days);

            // Get messages from Firestore
            const messages = await firestoreService.getMessagesByDateRange(
                startDate.toISOString(),
                endDate.toISOString()
            );

            // Get conversations
            const conversations = await firestoreService.getConversations();

            // Get channels for mapping
            const channels = await getChannels();

            // Create channel mapping
            const channelMap = new Map<string, { name: string; type: string }>(
                channels.map((ch: Channel) => [ch.id, { name: ch.name, type: ch.type }])
            );            // Process analytics
            const analytics: MessageAnalytics = {
                totalMessages: messages.length,
                totalConversations: conversations.length,
                messagesByChannel: this.groupMessagesByChannel(messages, channelMap),
                messagesByHour: this.groupMessagesByHour(messages),
                messagesByDay: this.groupMessagesByDay(messages),
                responseTime: this.calculateResponseTimes(messages),
                customerSatisfaction: this.calculateSatisfactionScore(conversations),
                busyHours: this.findBusyHours(messages),
                topChannels: this.getTopChannels(messages, channelMap),
                dailyTrends: this.calculateDailyTrends(messages, days)
            };

            this.setCachedData(cacheKey, analytics);
            return analytics;

        } catch (error) {
            console.error('Error getting overall analytics:', error);

            // Return mock data as fallback
            return this.getMockAnalytics();
        }
    }

    async getChannelStats(): Promise<ChannelStats[]> {
        const cacheKey = 'channel_stats';
        const cached = this.getCachedData(cacheKey);
        if (cached) return cached;

        try {
            const channels = await getChannels();
            const stats: ChannelStats[] = [];

            for (const channel of channels) {
                const messages = await firestoreService.getMessagesByChannel(channel.id);
                const conversations = await firestoreService.getConversationsByChannel(channel.id);

                const incomingMessages = messages.filter((m: any) => m.direction === 'incoming').length;
                const outgoingMessages = messages.filter((m: any) => m.direction === 'outgoing').length; const responseTimes = this.calculateChannelResponseTime(messages);

                const channelStat: ChannelStats = {
                    channelId: channel.id,
                    channelName: channel.name,
                    channelType: channel.type,
                    totalMessages: messages.length,
                    incomingMessages,
                    outgoingMessages,
                    avgResponseTime: responseTimes.average,
                    lastActivity: channel.lastActivity || 'Unknown',
                    activeConversations: conversations.length
                };

                stats.push(channelStat);
            }

            this.setCachedData(cacheKey, stats);
            return stats;

        } catch (error) {
            console.error('Error getting channel stats:', error);
            return this.getMockChannelStats();
        }
    }

    private groupMessagesByChannel(messages: any[], channelMap: Map<string, any>): Record<string, number> {
        const grouped: Record<string, number> = {};

        messages.forEach(message => {
            const channelInfo = channelMap.get(message.channelId);
            const channelName = channelInfo ? `${channelInfo.name} (${channelInfo.type})` : message.channelId;
            grouped[channelName] = (grouped[channelName] || 0) + 1;
        });

        return grouped;
    }

    private groupMessagesByHour(messages: any[]): Record<string, number> {
        const grouped: Record<string, number> = {};

        messages.forEach(message => {
            const hour = new Date(message.timestamp).getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            grouped[hourKey] = (grouped[hourKey] || 0) + 1;
        });

        return grouped;
    }

    private groupMessagesByDay(messages: any[]): Record<string, number> {
        const grouped: Record<string, number> = {};

        messages.forEach(message => {
            const date = new Date(message.timestamp).toDateString();
            grouped[date] = (grouped[date] || 0) + 1;
        });

        return grouped;
    }

    private calculateResponseTimes(messages: any[]) {
        const responseTimes: number[] = [];
        const sortedMessages = messages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (let i = 0; i < sortedMessages.length - 1; i++) {
            const current = sortedMessages[i];
            const next = sortedMessages[i + 1];

            if (
                current.direction === 'incoming' &&
                next.direction === 'outgoing' &&
                current.conversationId === next.conversationId
            ) {
                const responseTime = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
                responseTimes.push(responseTime / 1000); // Convert to seconds
            }
        }

        const average = responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;

        const sorted = responseTimes.sort((a, b) => a - b);
        const median = sorted.length > 0
            ? sorted[Math.floor(sorted.length / 2)]
            : 0;

        return { average, median };
    }

    private calculateChannelResponseTime(messages: any[]) {
        const responseTimes: number[] = [];
        const sortedMessages = messages.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (let i = 0; i < sortedMessages.length - 1; i++) {
            const current = sortedMessages[i];
            const next = sortedMessages[i + 1];

            if (
                current.direction === 'incoming' &&
                next.direction === 'outgoing' &&
                current.conversationId === next.conversationId
            ) {
                const responseTime = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();
                responseTimes.push(responseTime / 1000);
            }
        }

        const average = responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;

        return { average, count: responseTimes.length };
    }

    private calculateSatisfactionScore(conversations: any[]): number {
        // Mock satisfaction score calculation
        // In a real implementation, this would be based on user feedback
        const scores = [4.2, 4.5, 4.1, 4.8, 4.3, 4.6, 4.4, 4.7];
        return scores[Math.floor(Math.random() * scores.length)];
    }

    private findBusyHours(messages: any[]): string[] {
        const hourCounts = this.groupMessagesByHour(messages);
        const sortedHours = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => hour);

        return sortedHours;
    }

    private getTopChannels(messages: any[], channelMap: Map<string, any>) {
        const channelCounts: Record<string, { count: number; responseTimes: number[] }> = {};

        messages.forEach(message => {
            const channelId = message.channelId;
            if (!channelCounts[channelId]) {
                channelCounts[channelId] = { count: 0, responseTimes: [] };
            }
            channelCounts[channelId].count++;
        });

        return Object.entries(channelCounts)
            .map(([channelId, data]) => {
                const channelInfo = channelMap.get(channelId);
                const avgResponseTime = data.responseTimes.length > 0
                    ? data.responseTimes.reduce((sum, time) => sum + time, 0) / data.responseTimes.length
                    : 0;

                return {
                    channelId,
                    channelName: channelInfo?.name || 'Unknown Channel',
                    channelType: channelInfo?.type || 'Unknown',
                    messageCount: data.count,
                    responseTime: avgResponseTime
                };
            })
            .sort((a, b) => b.messageCount - a.messageCount)
            .slice(0, 5);
    }

    private calculateDailyTrends(messages: any[], days: number) {
        const trends = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayMessages = messages.filter(message => {
                const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
                return messageDate === dateStr;
            });

            const incoming = dayMessages.filter(m => m.direction === 'incoming').length;
            const outgoing = dayMessages.filter(m => m.direction === 'outgoing').length;

            trends.push({
                date: dateStr,
                incoming,
                outgoing,
                total: incoming + outgoing
            });
        }

        return trends;
    }

    private getMockAnalytics(): MessageAnalytics {
        return {
            totalMessages: 1250,
            totalConversations: 89,
            messagesByChannel: {
                'WhatsApp Business': 450,
                'Telegram Bot': 320,
                'Website Widget': 280,
                'Facebook Messenger': 200
            },
            messagesByHour: {
                '09:00': 85, '10:00': 120, '11:00': 95, '12:00': 75,
                '13:00': 65, '14:00': 110, '15:00': 130, '16:00': 125,
                '17:00': 90, '18:00': 70, '19:00': 45, '20:00': 35
            },
            messagesByDay: {
                'Mon Dec 09 2024': 180,
                'Tue Dec 10 2024': 220,
                'Wed Dec 11 2024': 195,
                'Thu Dec 12 2024': 245,
                'Fri Dec 13 2024': 210
            },
            responseTime: {
                average: 45.2,
                median: 32.0
            },
            customerSatisfaction: 4.6,
            busyHours: ['15:00', '14:00', '16:00'],
            topChannels: [
                {
                    channelId: 'whatsapp-1',
                    channelName: 'WhatsApp Business',
                    channelType: 'WhatsApp',
                    messageCount: 450,
                    responseTime: 42.1
                },
                {
                    channelId: 'telegram-1',
                    channelName: 'Telegram Bot',
                    channelType: 'Telegram',
                    messageCount: 320,
                    responseTime: 38.5
                }
            ],
            dailyTrends: [
                { date: '2024-12-09', incoming: 90, outgoing: 90, total: 180 },
                { date: '2024-12-10', incoming: 110, outgoing: 110, total: 220 },
                { date: '2024-12-11', incoming: 98, outgoing: 97, total: 195 },
                { date: '2024-12-12', incoming: 123, outgoing: 122, total: 245 },
                { date: '2024-12-13', incoming: 105, outgoing: 105, total: 210 }
            ]
        };
    }

    private getMockChannelStats(): ChannelStats[] {
        return [
            {
                channelId: 'whatsapp-1',
                channelName: 'WhatsApp Business',
                channelType: 'WhatsApp',
                totalMessages: 450,
                incomingMessages: 225,
                outgoingMessages: 225,
                avgResponseTime: 42.1,
                lastActivity: '2 minutes ago',
                activeConversations: 15
            },
            {
                channelId: 'telegram-1',
                channelName: 'Telegram Bot',
                channelType: 'Telegram',
                totalMessages: 320,
                incomingMessages: 160,
                outgoingMessages: 160,
                avgResponseTime: 38.5,
                lastActivity: '5 minutes ago',
                activeConversations: 12
            }
        ];
    }

    // Clear cache
    clearCache(): void {
        this.cache.clear();
    }
}

export const analyticsService = new AnalyticsService();