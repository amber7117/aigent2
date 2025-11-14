import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const startTime = Date.now();

        // Simulate various health checks
        const healthChecks = {
            database: await checkDatabase(),
            api: await checkAPI(),
            externalServices: await checkExternalServices(),
            memory: checkMemoryUsage(),
            uptime: process.uptime(),
        };

        const responseTime = Date.now() - startTime;
        const allHealthy = Object.values(healthChecks).every(check => {
            if (typeof check === 'number') return check > 0;
            if (typeof check === 'object' && check !== null && 'status' in check) {
                return (check as any).status === 'healthy';
            }
            return false;
        });

        const status = {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            responseTime: `${responseTime}ms`,
            uptime: `${Math.floor(healthChecks.uptime / 60)} minutes`,
            checks: healthChecks,
        };

        return NextResponse.json(status, {
            status: allHealthy ? 200 : 503,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
        }, { status: 500 });
    }
}

async function checkDatabase() {
    // Simulate database check
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                status: 'healthy',
                responseTime: Math.random() * 50 + 10, // 10-60ms
                lastCheck: new Date().toISOString(),
            });
        }, Math.random() * 100 + 50);
    });
}

async function checkAPI() {
    // Simulate API endpoints check
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                status: 'healthy',
                endpoints: {
                    '/api/auth': 'healthy',
                    '/api/conversations': 'healthy',
                    '/api/agents': 'healthy',
                    '/api/analytics': 'healthy',
                },
                lastCheck: new Date().toISOString(),
            });
        }, Math.random() * 100 + 30);
    });
}

async function checkExternalServices() {
    // Simulate external services check
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                status: 'healthy',
                services: {
                    whatsapp: 'healthy',
                    wechat: 'healthy',
                    openai: 'healthy',
                    gemini: 'healthy',
                },
                lastCheck: new Date().toISOString(),
            });
        }, Math.random() * 150 + 100);
    });
}

function checkMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        return {
            status: 'healthy',
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
            external: `${Math.round(usage.external / 1024 / 1024)} MB`,
        };
    }
    return {
        status: 'unavailable',
        message: 'Memory usage not available in this environment',
    };
}