import { NextRequest, NextResponse } from 'next/server';
import { getTelegramManager } from '@/lib/telegram-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, sessionId, ...params } = body;

        const telegramManager = getTelegramManager();

        switch (action) {
            case 'create_session':
                const { apiId, apiHash } = params;
                if (!apiId || !apiHash) {
                    return NextResponse.json(
                        { error: 'API ID and API Hash are required' },
                        { status: 400 }
                    );
                }
                const session = await telegramManager.createSession(sessionId, apiId, apiHash);
                return NextResponse.json({ success: true, session });

            case 'start_session':
                const { phoneNumber } = params;
                if (!phoneNumber) {
                    return NextResponse.json(
                        { error: 'Phone number is required' },
                        { status: 400 }
                    );
                }
                const started = await telegramManager.startSession(sessionId, phoneNumber);
                return NextResponse.json({ success: started });

            case 'stop_session':
                const stopped = await telegramManager.stopSession(sessionId);
                return NextResponse.json({ success: stopped });

            case 'send_message':
                const { toUserId, message } = params;
                if (!toUserId || !message) {
                    return NextResponse.json(
                        { error: 'Recipient user ID and message are required' },
                        { status: 400 }
                    );
                }
                const sent = await telegramManager.sendMessage(sessionId, toUserId, message);
                return NextResponse.json({ success: sent });

            case 'get_session_status':
                const status = telegramManager.getSessionStatus(sessionId);
                return NextResponse.json({ success: true, status });

            case 'get_all_sessions':
                const sessions = telegramManager.getAllSessions();
                return NextResponse.json({ success: true, sessions });

            case 'delete_session':
                const deleted = await telegramManager.deleteSession(sessionId);
                return NextResponse.json({ success: deleted });

            case 'set_auto_reply':
                const { enabled } = params;
                if (typeof enabled !== 'boolean') {
                    return NextResponse.json(
                        { error: 'Enabled parameter must be a boolean' },
                        { status: 400 }
                    );
                }
                telegramManager.setAutoReply(sessionId, enabled);
                return NextResponse.json({ success: true });

            case 'get_auto_reply_status':
                const autoReplyStatus = telegramManager.getAutoReplyStatus(sessionId);
                return NextResponse.json({ success: true, enabled: autoReplyStatus });

            case 'sync_chat_history':
                const { limit } = params;
                try {
                    const messageCount = await telegramManager.syncChatHistory(sessionId, limit || 50);
                    return NextResponse.json({ success: true, messageCount });
                } catch (error) {
                    return NextResponse.json(
                        { error: 'Failed to sync chat history' },
                        { status: 500 }
                    );
                }

            case 'update_session':
                const { updates } = params;
                if (!updates) {
                    return NextResponse.json(
                        { error: 'Updates object is required' },
                        { status: 400 }
                    );
                }
                const updated = await telegramManager.updateSession(sessionId, updates);
                return NextResponse.json({ success: updated });

            case 'bind_agent':
                const { agentId } = params;
                if (!agentId) {
                    return NextResponse.json(
                        { error: 'Agent ID is required' },
                        { status: 400 }
                    );
                }
                telegramManager.bindAgent(sessionId, agentId);
                return NextResponse.json({ success: true });

            case 'unbind_agent':
                telegramManager.unbindAgent(sessionId);
                return NextResponse.json({ success: true });

            case 'get_bound_agent':
                const boundAgent = telegramManager.getBoundAgent(sessionId);
                return NextResponse.json({ success: true, agentId: boundAgent });

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Telegram API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const telegramManager = getTelegramManager();
        const sessions = telegramManager.getAllSessions();

        return NextResponse.json({
            success: true,
            sessions,
            message: 'Telegram API is running'
        });
    } catch (error) {
        console.error('Telegram API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
