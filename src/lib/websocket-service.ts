'use client';

import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
    type: 'new_message' | 'message_update' | 'conversation_update' | 'channel_status';
    data: any;
    timestamp: string;
}

interface WebSocketService {
    connect: (conversationId?: string) => void;
    disconnect: () => void;
    sendMessage: (message: any) => void;
    isConnected: boolean;
}

class WebSocketManager implements WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private listeners: Map<string, Function[]> = new Map();
    private connectionUrl: string;

    constructor() {
        this.connectionUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:9003/ws`;
    }

    connect(conversationId?: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const url = conversationId
                ? `${this.connectionUrl}?conversationId=${conversationId}`
                : this.connectionUrl;

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.emit('connected', {});
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.emit(message.type, message.data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.emit('disconnected', { code: event.code, reason: event.reason });
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.attemptReconnect();
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        this.reconnectAttempts = 0;
    }

    sendMessage(message: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data: any) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in WebSocket listener:', error);
                }
            });
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    this.connect();
                }
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed', {});
        }
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// React hook for using WebSocket in components
export function useWebSocket(conversationId?: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const wsManagerRef = useRef<WebSocketManager | null>(null);

    useEffect(() => {
        const manager = new WebSocketManager();
        wsManagerRef.current = manager;

        manager.on('connected', () => {
            setIsConnected(true);
        });

        manager.on('disconnected', () => {
            setIsConnected(false);
        });

        manager.on('new_message', (message: any) => {
            setMessages(prev => [...prev, message]);
        });

        manager.on('message_update', (update: { id: any; }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === update.id ? { ...msg, ...update } : msg
            ));
        });

        manager.connect(conversationId);

        return () => {
            manager.disconnect();
        };
    }, [conversationId]);

    const sendMessage = (message: any) => {
        if (wsManagerRef.current) {
            return wsManagerRef.current.sendMessage(message);
        }
        return false;
    };

    return {
        isConnected,
        messages,
        sendMessage
    };
}

// Singleton instance for global use
let globalWebSocketManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
    if (!globalWebSocketManager) {
        globalWebSocketManager = new WebSocketManager();
    }
    return globalWebSocketManager;
}

export default WebSocketManager;
