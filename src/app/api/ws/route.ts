import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';

// WebSocket server for real-time communication
const wss = new WebSocketServer({ noServer: true });

interface Client {
    ws: WebSocket;
    conversationId?: string;
    userId?: string;
}

const clients = new Set<Client>();

wss.on('connection', (ws: WebSocket, request: NextRequest) => {
    const url = new URL(request.url || '', 'http://localhost:9003');
    const conversationId = url.searchParams.get('conversationId') || undefined;

    const client: Client = { ws, conversationId };
    clients.add(client);

    console.log(`WebSocket client connected: ${conversationId || 'global'}`);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        data: {
            conversationId,
            timestamp: new Date().toISOString(),
            message: 'WebSocket connection established'
        }
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleClientMessage(client, message);
        } catch (error) {
            console.error('Failed to parse client message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                data: { error: 'Invalid message format' }
            }));
        }
    });

    ws.on('close', () => {
        clients.delete(client);
        console.log(`WebSocket client disconnected: ${conversationId || 'global'}`);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(client);
    });
});

function handleClientMessage(client: Client, message: any) {
    const { type, data } = message;

    switch (type) {
        case 'ping':
            client.ws.send(JSON.stringify({
                type: 'pong',
                data: { timestamp: new Date().toISOString() }
            }));
            break;

        case 'subscribe':
            if (data.conversationId) {
                client.conversationId = data.conversationId;
                console.log(`Client subscribed to conversation: ${data.conversationId}`);
            }
            break;

        case 'unsubscribe':
            client.conversationId = undefined;
            console.log('Client unsubscribed from conversation');
            break;

        case 'typing_start':
            broadcastToConversation(client.conversationId, {
                type: 'user_typing',
                data: {
                    conversationId: client.conversationId,
                    userId: data.userId,
                    isTyping: true
                }
            });
            break;

        case 'typing_stop':
            broadcastToConversation(client.conversationId, {
                type: 'user_typing',
                data: {
                    conversationId: client.conversationId,
                    userId: data.userId,
                    isTyping: false
                }
            });
            break;

        default:
            console.log('Unknown message type:', type);
    }
}

// Broadcast message to all clients in a conversation
export function broadcastToConversation(conversationId: string | undefined, message: any) {
    const messageString = JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN &&
            (client.conversationId === conversationId || !conversationId)) {
            client.ws.send(messageString);
        }
    });
}

// Broadcast new message to relevant clients
export function broadcastNewMessage(message: any) {
    broadcastToConversation(message.conversationId, {
        type: 'new_message',
        data: message
    });
}

// Broadcast message update
export function broadcastMessageUpdate(update: any) {
    broadcastToConversation(update.conversationId, {
        type: 'message_update',
        data: update
    });
}

// Broadcast conversation update
export function broadcastConversationUpdate(update: any) {
    broadcastToConversation(update.id, {
        type: 'conversation_update',
        data: update
    });
}

// Broadcast channel status update
export function broadcastChannelStatus(update: any) {
    broadcastToConversation(undefined, {
        type: 'channel_status',
        data: update
    });
}

export async function GET(request: NextRequest) {
    return new Response('WebSocket endpoint - use WebSocket protocol', {
        status: 426,
        headers: { 'Upgrade': 'websocket' }
    });
}

// Handle WebSocket upgrade
export async function POST(request: NextRequest) {
    return new Response('WebSocket endpoint - use WebSocket protocol', {
        status: 426,
        headers: { 'Upgrade': 'websocket' }
    });
}
