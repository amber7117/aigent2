import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';

export async function POST(req: NextRequest) {
    try {
        const { action, channelId, ...data } = await req.json();

        switch (action) {
            case 'saveChannel':
                await firestoreService.saveChannel(data);
                return NextResponse.json({ success: true });

            case 'updateChannel':
                await firestoreService.updateChannelStatus(channelId, data);
                return NextResponse.json({ success: true });

            case 'getChannel':
                const channel = await firestoreService.getChannel(channelId);
                return NextResponse.json({ success: true, data: channel });

            case 'getAllChannels':
                const channels = await firestoreService.getAllChannels();
                return NextResponse.json({ success: true, data: channels });

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Firestore API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}