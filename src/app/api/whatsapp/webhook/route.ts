import { NextRequest, NextResponse } from 'next/server';

// WhatsApp webhook endpoint for Bailey events
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, data, sessionId } = body;

        console.log('WhatsApp Bailey webhook received:', { type, sessionId });

        switch (type) {
            case 'connection.update':
                // Handle connection status changes
                console.log('Connection status:', data.connection);

                if (data.connection === 'open') {
                    // Connection successful
                    return NextResponse.json({
                        success: true,
                        message: 'WhatsApp connection established',
                        status: 'connected'
                    });
                } else if (data.connection === 'close') {
                    // Connection lost
                    return NextResponse.json({
                        success: true,
                        message: 'WhatsApp connection closed',
                        status: 'disconnected'
                    });
                }
                break;

            case 'messages.upsert':
                // Handle incoming messages
                const messages = data.messages || [];
                console.log('New messages received:', messages.length);

                // Process each message
                for (const message of messages) {
                    if (!message.key.fromMe) { // Only process received messages
                        console.log('Processing incoming message:', message.key.id);

                        // Here you would typically:
                        // 1. Save the message to database
                        // 2. Trigger AI auto-reply if enabled
                        // 3. Notify connected clients via WebSocket
                    }
                }

                return NextResponse.json({
                    success: true,
                    message: 'Messages processed',
                    processed: messages.length
                });

            case 'messages.reaction':
                // Handle message reactions
                console.log('Message reaction:', data);
                return NextResponse.json({
                    success: true,
                    message: 'Reaction processed'
                });

            case 'presence.update':
                // Handle presence updates (online/offline, typing, etc.)
                console.log('Presence update:', data);
                return NextResponse.json({
                    success: true,
                    message: 'Presence updated'
                });

            case 'groups.upsert':
                // Handle group updates
                console.log('Group update:', data);
                return NextResponse.json({
                    success: true,
                    message: 'Group information updated'
                });

            case 'contacts.upsert':
                // Handle contact updates
                console.log('Contact update:', data);
                return NextResponse.json({
                    success: true,
                    message: 'Contacts updated'
                });

            default:
                console.log('Unknown webhook type:', type);
                return NextResponse.json({
                    success: true,
                    message: 'Event acknowledged'
                });
        }

        return NextResponse.json({
            success: true,
            message: 'Webhook processed'
        });

    } catch (error) {
        console.error('WhatsApp webhook error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Webhook processing failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Health check for webhook endpoint
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'WhatsApp webhook endpoint is active',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook: '/api/whatsapp/webhook',
            qr: '/api/whatsapp/qr',
            connect: '/api/whatsapp/connect'
        }
    });
}