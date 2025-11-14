import { NextRequest, NextResponse } from 'next/server';
import { createTestData, clearTestData } from '@/lib/test-analytics';

export async function POST(request: NextRequest) {
    try {
        const { action } = await request.json();

        if (action === 'create') {
            const result = await createTestData();

            if (result.success) {
                return NextResponse.json({
                    success: true,
                    message: 'Test data created successfully',
                    channelId: result.channelId
                });
            } else {
                return NextResponse.json(
                    { success: false, message: 'Failed to create test data', error: result.error },
                    { status: 500 }
                );
            }
        } else if (action === 'clear') {
            const result = await clearTestData();

            if (result.success) {
                return NextResponse.json({
                    success: true,
                    message: 'Test data cleared successfully'
                });
            } else {
                return NextResponse.json(
                    { success: false, message: 'Failed to clear test data', error: result.error },
                    { status: 500 }
                );
            }
        } else {
            return NextResponse.json(
                { success: false, message: 'Invalid action. Use "create" or "clear"' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error in test data API:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: String(error) },
            { status: 500 }
        );
    }
}