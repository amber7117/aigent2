import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics-service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const type = searchParams.get('type') || 'overview';

        if (type === 'channels') {
            const channelStats = await analyticsService.getChannelStats();
            return NextResponse.json({
                success: true,
                data: channelStats
            });
        }

        if (type === 'overview') {
            const analytics = await analyticsService.getOverallAnalytics(days);
            return NextResponse.json({
                success: true,
                data: analytics
            });
        }

        return NextResponse.json({
            error: 'Invalid analytics type. Use "overview" or "channels".'
        }, { status: 400 });

    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Clear cache endpoint
export async function DELETE(request: NextRequest) {
    try {
        analyticsService.clearCache();
        return NextResponse.json({
            success: true,
            message: 'Analytics cache cleared'
        });
    } catch (error) {
        console.error('Error clearing analytics cache:', error);
        return NextResponse.json({
            error: 'Failed to clear cache'
        }, { status: 500 });
    }
}