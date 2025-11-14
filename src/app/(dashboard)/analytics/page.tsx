'use client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertTriangle, MessageCircle, Clock, BarChart3, TrendingUp } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type DateRange = '24h' | '7d' | '30d' | '90d';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('7d');
    const [refreshing, setRefreshing] = useState(false);
    const [creatingTestData, setCreatingTestData] = useState(false);

    const fetchAnalytics = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const response = await fetch(`/api/analytics?period=${dateRange}`);
            if (!response.ok) {
                throw new Error('Failed to fetch analytics data');
            }

            const data = await response.json();
            setAnalytics(data);
        } catch (err) {
            console.error('Failed to fetch analytics data:', err);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handleRefresh = async () => {
        // Clear cache first
        try {
            await fetch('/api/analytics', { method: 'DELETE' });
        } catch (err) {
            console.warn('Failed to clear cache:', err);
        }
        fetchAnalytics(true);
    };

    const handleCreateTestData = async () => {
        setCreatingTestData(true);
        try {
            const response = await fetch('/api/test-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create' })
            });

            const result = await response.json();
            if (result.success) {
                // Refresh analytics after creating test data
                handleRefresh();
            } else {
                console.error('Failed to create test data:', result.error);
            }
        } catch (error) {
            console.error('Error creating test data:', error);
        } finally {
            setCreatingTestData(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        fetchAnalytics();
    };

    const formatResponseTime = (seconds: number) => {
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`;
        }
        return `${(seconds / 60).toFixed(1)}m`;
    };

    if (loading && !refreshing) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-[180px]" />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-5 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-4 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                        <p className="text-muted-foreground">
                            Get insights into your customer interactions.
                        </p>
                    </div>
                </div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="outline" size="sm" onClick={handleRetry} className="ml-2">
                            Try Again
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const stats = analytics?.overall || {};
    const channelData = analytics?.channels || [];
    const hasData = stats.totalMessages > 0 || channelData.length > 0;

    // Prepare chart data
    const messageVolumeData = Object.entries(stats.messagesByDay || {}).map(([date, count]) => ({
        date,
        messages: count,
    }));

    const channelStatsData = channelData.map((channel: any) => ({
        channel: channel.name || channel.id,
        messages: channel.totalMessages || 0,
        responseTime: channel.avgResponseTime || 0,
    }));

    const responseTimeData = Object.entries(stats.avgResponseTimeByDay || {}).map(([date, time]) => ({
        date,
        responseTime: time,
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground">
                        Get insights into your customer interactions across all channels.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateTestData}
                        disabled={creatingTestData}
                        className="flex items-center gap-2"
                    >
                        <BarChart3 className={`h-4 w-4 ${creatingTestData ? 'animate-pulse' : ''}`} />
                        {creatingTestData ? 'Creating...' : 'Create Test Data'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">Last 24 hours</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {refreshing && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Updating data...</span>
                </div>
            )}

            {!hasData && !loading && !error && (
                <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">暂无数据</h3>
                    <p className="text-muted-foreground mb-4">
                        还没有记录到任何消息。开始连接您的渠道或创建一些测试数据。
                    </p>
                    <Button onClick={handleCreateTestData} disabled={creatingTestData}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {creatingTestData ? '创建中...' : '创建测试数据'}
                    </Button>
                </div>
            )}

            {hasData && (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">总消息数</CardTitle>
                                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalMessages || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    所有渠道
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatResponseTime(stats.avgResponseTime || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    首次响应时间
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">活跃渠道</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{channelData.length}</div>
                                <p className="text-xs text-muted-foreground">
                                    有消息活动
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">高峰时段</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.peakHour || 'N/A'}</div>
                                <p className="text-xs text-muted-foreground">
                                    最活跃时间
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Message Volume Chart */}
                    {messageVolumeData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>消息量统计</CardTitle>
                                <CardDescription>
                                    所有渠道每日消息量
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={messageVolumeData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="messages" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Channel Performance */}
                        {channelStatsData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>渠道表现</CardTitle>
                                    <CardDescription>
                                        各渠道消息量
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={channelStatsData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="channel" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="messages" fill="#82ca9d" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}

                        {/* Response Time Trend */}
                        {responseTimeData.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>响应时间趋势</CardTitle>
                                    <CardDescription>
                                        平均响应时间变化
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={responseTimeData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line
                                                type="monotone"
                                                dataKey="responseTime"
                                                stroke="#8884d8"
                                                activeDot={{ r: 8 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Channel Details Table */}
                    {channelData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>渠道详情</CardTitle>
                                <CardDescription>
                                    各渠道详细指标
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">渠道</th>
                                                <th className="text-right p-2">消息数</th>
                                                <th className="text-right p-2">平均响应时间</th>
                                                <th className="text-right p-2">最后活动</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {channelData.map((channel: any, index: number) => (
                                                <tr key={channel.id || index} className="border-b">
                                                    <td className="p-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium">
                                                                {channel.name || `Channel ${index + 1}`}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {channel.type || 'Unknown'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-right p-2">{channel.totalMessages || 0}</td>
                                                    <td className="text-right p-2">
                                                        {formatResponseTime(channel.avgResponseTime || 0)}
                                                    </td>
                                                    <td className="text-right p-2">
                                                        {channel.lastActivity
                                                            ? new Date(channel.lastActivity).toLocaleDateString()
                                                            : 'N/A'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}