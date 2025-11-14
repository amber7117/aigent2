import { NextRequest, NextResponse } from 'next/server';
import { getMarketingService } from '@/lib/marketing-service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        const marketingService = getMarketingService();

        switch (action) {
            case 'connections':
                const connections = await marketingService.getConnections();
                return NextResponse.json({ success: true, connections });

            case 'campaigns':
                const campaigns = await marketingService.getCampaigns();
                return NextResponse.json({ success: true, campaigns });

            default:
                return NextResponse.json({
                    success: true,
                    message: 'Marketing API is running',
                    endpoints: [
                        'GET /api/marketing?action=connections',
                        'GET /api/marketing?action=campaigns',
                        'POST /api/marketing/connect',
                        'POST /api/marketing/campaign',
                        'GET /api/marketing/performance/:campaignId'
                    ]
                });
        }
    } catch (error) {
        console.error('Error in marketing API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, platform, credentials, campaignData } = body;

        const marketingService = getMarketingService();

        switch (action) {
            case 'connect':
                if (!platform || !credentials) {
                    return NextResponse.json(
                        { success: false, error: 'Platform and credentials are required' },
                        { status: 400 }
                    );
                }

                const connected = await marketingService.connectPlatform(platform, credentials);
                if (connected) {
                    return NextResponse.json({
                        success: true,
                        message: `Successfully connected to ${platform}`
                    });
                } else {
                    return NextResponse.json(
                        { success: false, error: `Failed to connect to ${platform}` },
                        { status: 400 }
                    );
                }

            case 'create-campaign':
                if (!platform || !campaignData) {
                    return NextResponse.json(
                        { success: false, error: 'Platform and campaign data are required' },
                        { status: 400 }
                    );
                }

                const campaignId = await marketingService.createCampaign(platform, campaignData);
                return NextResponse.json({
                    success: true,
                    campaignId,
                    message: `Campaign created successfully on ${platform}`
                });

            case 'disconnect':
                if (!platform) {
                    return NextResponse.json(
                        { success: false, error: 'Platform is required' },
                        { status: 400 }
                    );
                }

                const disconnected = await marketingService.disconnectPlatform(platform);
                if (disconnected) {
                    return NextResponse.json({
                        success: true,
                        message: `Successfully disconnected from ${platform}`
                    });
                } else {
                    return NextResponse.json(
                        { success: false, error: `Failed to disconnect from ${platform}` },
                        { status: 400 }
                    );
                }

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error in marketing API:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
