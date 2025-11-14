import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppManager } from '@/lib/whatsapp-client';

// Real Bailey WhatsApp QR generation
export async function GET() {
    try {
        console.log('Initializing real WhatsApp Bailey client...');

        const whatsappManager = getWhatsAppManager();
        const sessionId = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Create real Bailey session and get QR code
        const result = await whatsappManager.createSession(sessionId);

        if (result.success && result.qr) {
            console.log(`Real WhatsApp QR code generated for session: ${sessionId}`);

            return NextResponse.json({
                success: true,
                qr: result.qr,
                qrId: sessionId,
                expiresIn: 60, // QR code expires in 60 seconds
                message: 'Real WhatsApp QR code generated via Bailey. Please scan within 60 seconds.',
                instructions: [
                    '1. Open WhatsApp on your phone',
                    '2. Go to Settings > Linked Devices',
                    '3. Tap "Link a Device"',
                    '4. Scan this QR code',
                    '5. Your phone will connect to WhatsApp Web via Bailey'
                ]
            });
        } else {
            throw new Error(result.error || 'Failed to generate QR code');
        }

    } catch (error) {
        console.error('Failed to generate real WhatsApp QR:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate QR code',
                message: 'Unable to initialize Bailey WhatsApp client. Please try again.',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Check real Bailey connection status
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { qrId, action } = body;

        const whatsappManager = getWhatsAppManager();

        if (action === 'check-status') {
            const sessionInfo = whatsappManager.getSessionInfo(qrId);

            if (!sessionInfo) {
                return NextResponse.json({
                    success: false,
                    status: 'invalid',
                    message: 'Session not found'
                });
            }

            if (sessionInfo.isConnected) {
                return NextResponse.json({
                    success: true,
                    status: 'confirmed',
                    message: 'WhatsApp connected successfully via Bailey',
                    connectionData: {
                        sessionId: sessionInfo.id,
                        phoneNumber: sessionInfo.phoneNumber,
                        name: sessionInfo.name,
                        connectedAt: new Date().toISOString()
                    }
                });
            } else if (sessionInfo.qrCode) {
                return NextResponse.json({
                    success: true,
                    status: 'ready',
                    message: 'QR code ready, waiting for scan'
                });
            } else {
                return NextResponse.json({
                    success: true,
                    status: 'pending',
                    message: 'Waiting for QR code generation'
                });
            }
        }

        if (action === 'cancel') {
            await whatsappManager.disconnectSession(qrId);
            return NextResponse.json({
                success: true,
                status: 'cancelled',
                message: 'QR connection cancelled'
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action'
        }, { status: 400 });

    } catch (error) {
        console.error('Bailey WhatsApp QR status check error:', error);
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