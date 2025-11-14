import { NextRequest, NextResponse } from 'next/server';
import { initializeOmniChat, getOmniChatService } from '@/lib/omnichat-service';
import { getDatabase } from '@/lib/database';

// Initialize OmniChat services and AI agents for a specific channel
export async function POST(request: NextRequest) {
    try {
        const { channelId, connectionData, agentId } = await request.json();

        console.log(`Initializing OmniChat for channel: ${channelId}`);

        // Initialize OmniChat services
        await initializeOmniChat();

        const database = getDatabase();

        // Update channel with AI agent assignment
        if (channelId && agentId) {
            const channel = await database.getChannel(channelId);
            if (channel) {
                channel.agentId = agentId;
                channel.autoReply = true;
                channel.settings.replyDelay = 2; // 2 seconds delay
                channel.settings.replyProbability = 0.8; // 80% chance of replying

                await database.saveChannel(channel);
                console.log(`Channel ${channelId} updated with AI agent: ${agentId}`);
            }
        }

        // Get service status
        const service = getOmniChatService();
        const status = service.getStatus();

        return NextResponse.json({
            success: true,
            data: {
                channelId,
                agentId,
                services: status.services,
                initialized: status.initialized,
                features: {
                    autoReply: true,
                    aiAgent: true,
                    messageStorage: true,
                    connectionMonitoring: true
                }
            },
            message: 'OmniChat initialized successfully for channel'
        });

    } catch (error) {
        console.error('OmniChat initialization failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Initialization failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Get OmniChat service status
export async function GET() {
    try {
        const service = getOmniChatService();
        const status = service.getStatus();

        return NextResponse.json({
            success: true,
            data: status,
            message: 'OmniChat service status retrieved'
        });

    } catch (error) {
        console.error('Failed to get OmniChat status:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Status check failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}