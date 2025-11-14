import { NextRequest, NextResponse } from 'next/server';

// Enhanced WeChat connection with QR code support
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action = 'connect', qrId, sessionData } = body;

        if (action === 'confirm-connection') {
            // Confirm WeChat connection after QR scan
            console.log(`Confirming WeChat connection for QR: ${qrId}`);

            // Simulate WeChat OAuth and bot setup process
            await new Promise(resolve => setTimeout(resolve, 2500));

            const connectionInfo = {
                sessionId: `wechat_session_${Date.now()}`,
                openId: sessionData?.openId || `wx_${Math.random().toString(36).substring(2, 10)}`,
                nickname: sessionData?.nickname || '微信用户',
                avatar: sessionData?.avatar || 'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKsQa1QCqY0jB0fQJW3DZX6DBqH2ibYQ1J5icWOdFKTCg8xhZI2QtG8M4v4OaCuJdvPW8IQQKlJn8HA/132',
                status: 'connected',
                connectedAt: new Date().toISOString(),
                botInfo: {
                    appId: 'wx' + Math.random().toString(36).substring(2, 10),
                    botName: 'OmniChat 微信机器人',
                    version: '2.1.0'
                },
                capabilities: {
                    sendTextMessage: true,
                    sendImageMessage: true,
                    sendVoiceMessage: true,
                    receiveMessage: true,
                    customMenu: true,
                    templateMessage: true
                }
            };

            return NextResponse.json({
                success: true,
                data: connectionInfo,
                message: '微信连接成功',
                webhook: {
                    messageUrl: '/api/wechat/webhook/message',
                    eventUrl: '/api/wechat/webhook/event'
                }
            });
        }

        if (action === 'disconnect') {
            console.log('Disconnecting WeChat session...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            return NextResponse.json({
                success: true,
                message: '微信连接已断开'
            });
        }

        // Default connection (legacy)
        if (action === 'connect') {
            console.log('Initializing WeChat connection...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            const sessionData = {
                sessionId: `wechat_session_${Date.now()}`,
                userId: `wx_user_${Math.random().toString(36).substring(7)}`,
                status: 'connected',
                connectedAt: new Date().toISOString(),
                botName: 'OmniChat WeChat Bot'
            };

            return NextResponse.json({
                success: true,
                data: sessionData,
                message: '微信连接成功'
            });
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Invalid action',
                message: '无效的操作'
            },
            { status: 400 }
        );
    } catch (error) {
        console.error('WeChat operation failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'WeChat operation failed',
                message: '微信操作失败',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Get WeChat connection status and available features
        return NextResponse.json({
            success: true,
            data: {
                status: 'disconnected',
                lastConnected: null,
                availableBots: ['OmniChat 微信机器人', '客服机器人'],
                features: {
                    qrLogin: true,
                    oAuth: true,
                    miniProgram: true,
                    officialAccount: true
                },
                supportedMessageTypes: [
                    'text', 'image', 'voice', 'video',
                    'location', 'link', 'miniprogram'
                ]
            },
            message: '微信状态获取成功'
        });
    } catch (error) {
        console.error('Failed to get WeChat status:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Status check failed',
                message: '状态检查失败'
            },
            { status: 500 }
        );
    }
}

// Handle WeChat webhook events
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, data } = body;

        console.log('WeChat webhook event:', type, data);

        switch (type) {
            case 'message':
                // Handle incoming messages
                return NextResponse.json({
                    success: true,
                    message: '消息已处理'
                });

            case 'event':
                // Handle WeChat events (subscribe, unsubscribe, etc.)
                return NextResponse.json({
                    success: true,
                    message: '事件已处理'
                });

            case 'menu_click':
                // Handle custom menu clicks
                return NextResponse.json({
                    success: true,
                    message: '菜单点击已处理'
                });

            default:
                return NextResponse.json({
                    success: true,
                    message: '事件已确认'
                });
        }
    } catch (error) {
        console.error('WeChat webhook error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Webhook processing failed'
            },
            { status: 500 }
        );
    }
}