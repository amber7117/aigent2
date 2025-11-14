import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppManager } from '@/lib/whatsapp-client';

// Handle incoming WhatsApp messages from Bailey
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, messages } = body;

        console.log(`Processing ${messages?.length || 0} WhatsApp messages for session: ${sessionId}`);

        const whatsappManager = getWhatsAppManager();
        const sessionInfo = whatsappManager.getSessionInfo(sessionId);

        if (!sessionInfo || !sessionInfo.isConnected) {
            return NextResponse.json({
                success: false,
                error: 'Session not connected',
                message: 'WhatsApp session is not active'
            }, { status: 400 });
        }

        const processedMessages = [];

        for (const message of messages || []) {
            try {
                const processedMessage = {
                    id: message.key?.id,
                    from: message.key?.remoteJid,
                    fromUser: message.key?.fromMe ? sessionInfo.name : (message.pushName || 'Unknown'),
                    text: message.message?.conversation ||
                        message.message?.extendedTextMessage?.text ||
                        'Media message',
                    timestamp: new Date(message.messageTimestamp * 1000),
                    type: Object.keys(message.message || {})[0] || 'unknown',
                    isFromMe: message.key?.fromMe || false,
                    sessionId: sessionId
                };

                // Here you can integrate with your chat system
                // Example: Store in database, trigger AI responses, etc.

                console.log('Processed WhatsApp message:', {
                    from: processedMessage.from,
                    text: processedMessage.text.substring(0, 50) + '...',
                    type: processedMessage.type
                });

                processedMessages.push(processedMessage);

                // TODO: Integrate with OmniChat conversation system
                // await storeConversationMessage(processedMessage);

                // TODO: Trigger AI agent responses if enabled
                // await triggerAIAgentResponse(sessionId, processedMessage);

            } catch (messageError) {
                console.error('Failed to process individual message:', messageError);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                processedCount: processedMessages.length,
                sessionId: sessionId,
                messages: processedMessages
            },
            message: 'WhatsApp messages processed successfully'
        });

    } catch (error) {
        console.error('WhatsApp message processing failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Message processing failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Send message via WhatsApp Bailey
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, to, message, type = 'text' } = body;

        if (!sessionId || !to || !message) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields',
                message: 'Session ID, recipient, and message are required'
            }, { status: 400 });
        }

        const whatsappManager = getWhatsAppManager();
        const sessionInfo = whatsappManager.getSessionInfo(sessionId);

        if (!sessionInfo || !sessionInfo.isConnected) {
            return NextResponse.json({
                success: false,
                error: 'Session not connected',
                message: 'WhatsApp session is not active'
            }, { status: 400 });
        }

        // Send message via Bailey
        const sent = await whatsappManager.sendMessage(sessionId, to, message);

        if (sent) {
            const messageInfo = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                from: sessionInfo.phoneNumber,
                to: to,
                text: message,
                timestamp: new Date(),
                type: type,
                sessionId: sessionId,
                status: 'sent'
            };

            console.log('WhatsApp message sent:', {
                to: messageInfo.to,
                text: messageInfo.text.substring(0, 50) + '...'
            });

            // TODO: Store sent message in conversation system
            // await storeConversationMessage(messageInfo);

            return NextResponse.json({
                success: true,
                data: messageInfo,
                message: 'Message sent successfully via Bailey'
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to send message',
                message: 'Could not send message via WhatsApp'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Send message failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Get message history for a session
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
                error: 'Session not found'
            }, { status: 404 });
        }

        // TODO: Implement message history retrieval from database
        // For now, return session info
        return NextResponse.json({
            success: true,
            data: {
                sessionId: sessionId,
                isConnected: sessionInfo.isConnected,
                phoneNumber: sessionInfo.phoneNumber,
                name: sessionInfo.name,
                // messages: await getMessageHistory(sessionId)
                messages: [] // Placeholder
            },
            message: 'Session info retrieved'
        });

    } catch (error) {
        console.error('Failed to get WhatsApp message history:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve message history',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}