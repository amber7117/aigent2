import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppManager } from '@/lib/whatsapp-client';

// Handle WhatsApp status updates from Bailey
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, type, data } = body;

        console.log(`WhatsApp status update for session ${sessionId}:`, { type, data });

        const whatsappManager = getWhatsAppManager();

        switch (type) {
            case 'connection.update':
                const { connection, lastDisconnect, qr } = data;

                console.log(`Connection status: ${connection}`);

                if (connection === 'close') {
                    const disconnectReason = lastDisconnect?.error?.output?.statusCode;
                    console.log(`Connection closed, reason: ${disconnectReason}`);

                    // Handle different disconnect reasons
                    if (disconnectReason === 401) { // Logged out
                        return NextResponse.json({
                            success: true,
                            action: 'logout',
                            message: 'Device logged out of WhatsApp'
                        });
                    } else if (disconnectReason === 403) { // Banned
                        return NextResponse.json({
                            success: true,
                            action: 'banned',
                            message: 'WhatsApp account banned'
                        });
                    } else {
                        return NextResponse.json({
                            success: true,
                            action: 'reconnect',
                            message: 'Connection lost, attempting to reconnect'
                        });
                    }
                } else if (connection === 'open') {
                    console.log(`WhatsApp connection opened for session: ${sessionId}`);
                    return NextResponse.json({
                        success: true,
                        action: 'connected',
                        message: 'WhatsApp connected successfully'
                    });
                } else if (connection === 'connecting') {
                    return NextResponse.json({
                        success: true,
                        action: 'connecting',
                        message: 'Connecting to WhatsApp'
                    });
                }
                break;

            case 'presence.update':
                // Handle presence updates (online, offline, typing, etc.)
                const { id, presences } = data;

                console.log(`Presence update for ${id}:`, presences);

                // TODO: Update user presence in your chat interface
                // await updateUserPresence(sessionId, id, presences);

                return NextResponse.json({
                    success: true,
                    action: 'presence_updated',
                    message: 'Presence information updated'
                });

            case 'contacts.update':
                // Handle contact updates
                const contacts = data;

                console.log(`Contact updates for session ${sessionId}:`, contacts.length);

                // TODO: Update contact information in your system
                // await updateContacts(sessionId, contacts);

                return NextResponse.json({
                    success: true,
                    action: 'contacts_updated',
                    message: 'Contact information updated'
                });

            case 'chats.update':
                // Handle chat updates (unread count, last message, etc.)
                const chats = data;

                console.log(`Chat updates for session ${sessionId}:`, chats.length);

                // TODO: Update chat information in your system
                // await updateChats(sessionId, chats);

                return NextResponse.json({
                    success: true,
                    action: 'chats_updated',
                    message: 'Chat information updated'
                });

            case 'message.receipt.update':
                // Handle message receipt updates (sent, delivered, read)
                const receipts = data;

                console.log(`Message receipt updates for session ${sessionId}:`, receipts);

                // TODO: Update message status in your database
                // await updateMessageReceipts(sessionId, receipts);

                return NextResponse.json({
                    success: true,
                    action: 'receipts_updated',
                    message: 'Message receipts updated'
                });

            case 'groups.update':
                // Handle group updates
                const groups = data;

                console.log(`Group updates for session ${sessionId}:`, groups);

                // TODO: Update group information
                // await updateGroups(sessionId, groups);

                return NextResponse.json({
                    success: true,
                    action: 'groups_updated',
                    message: 'Group information updated'
                });

            default:
                console.log(`Unknown status update type: ${type}`);
                return NextResponse.json({
                    success: true,
                    action: 'acknowledged',
                    message: 'Status update acknowledged'
                });
        }

        return NextResponse.json({
            success: true,
            message: 'Status update processed'
        });

    } catch (error) {
        console.error('WhatsApp status update processing failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Status update processing failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Get current status of a WhatsApp session
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({
                success: false,
                error: 'Missing session ID'
            }, { status: 400 });
        }

        const whatsappManager = getWhatsAppManager();
        const sessionInfo = whatsappManager.getSessionInfo(sessionId);

        if (!sessionInfo) {
            return NextResponse.json({
                success: false,
                error: 'Session not found',
                data: {
                    sessionId,
                    status: 'not_found'
                }
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                sessionId: sessionInfo.id,
                isConnected: sessionInfo.isConnected,
                phoneNumber: sessionInfo.phoneNumber,
                name: sessionInfo.name,
                qrCode: sessionInfo.qrCode,
                status: sessionInfo.isConnected ? 'connected' : 'disconnected',
                lastUpdated: new Date().toISOString()
            },
            message: 'Session status retrieved'
        });

    } catch (error) {
        console.error('Failed to get WhatsApp session status:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve session status',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}