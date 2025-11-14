"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface TelegramDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConnectionSuccess?: () => void;
    channelId: string;
}

export function TelegramDialog({
    open,
    onOpenChange,
    onConnectionSuccess,
    channelId,
}: TelegramDialogProps) {
    const [apiId, setApiId] = useState("");
    const [apiHash, setApiHash] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [status, setStatus] = useState<'idle' | 'creating' | 'starting' | 'success' | 'error' | 'syncing'>('idle');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!open) {
            // Reset form when dialog closes
            setApiId("");
            setApiHash("");
            setPhoneNumber("");
            setStatus('idle');
            setSessionId(null);
        }
    }, [open]);

    const handleCreateSession = async () => {
        if (!apiId || !apiHash) {
            toast({
                title: "错误",
                description: "请填写 API ID 和 API Hash",
                variant: "destructive",
            });
            return;
        }

        setStatus('creating');

        try {
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_session',
                    sessionId: channelId,
                    apiId: parseInt(apiId),
                    apiHash
                })
            });

            const data = await response.json();

            if (data.success) {
                setSessionId(channelId);
                setStatus('idle');
                toast({
                    description: "Telegram 会话已创建，请输入手机号开始连接"
                });
            } else {
                throw new Error(data.error || '创建会话失败');
            }
        } catch (error) {
            console.error('Failed to create Telegram session:', error);
            setStatus('error');
            toast({
                title: "错误",
                description: `创建会话失败: ${error instanceof Error ? error.message : '未知错误'}`,
                variant: "destructive",
            });
        }
    };

    const handleStartSession = async () => {
        if (!phoneNumber) {
            toast({
                title: "错误",
                description: "请输入手机号",
                variant: "destructive",
            });
            return;
        }

        if (!sessionId) {
            toast({
                title: "错误",
                description: "请先创建会话",
                variant: "destructive",
            });
            return;
        }

        setStatus('starting');

        try {
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start_session',
                    sessionId,
                    phoneNumber
                })
            });

            const data = await response.json();

            if (data.success) {
                setStatus('success');
                toast({
                    description: "Telegram 连接成功！"
                });

                // 延迟关闭对话框并触发成功回调
                setTimeout(() => {
                    onConnectionSuccess?.();
                    onOpenChange(false);
                }, 2000);
            } else {
                throw new Error(data.error || '启动会话失败');
            }
        } catch (error) {
            console.error('Failed to start Telegram session:', error);
            setStatus('error');
            toast({
                title: "错误",
                description: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
                variant: "destructive",
            });
        }
    };

    const handleGetAPIInfo = () => {
        window.open('https://my.telegram.org/apps', '_blank');
    };

    // 切换自动回复开关
    const handleToggleAutoReply = async (enabled: boolean) => {
        if (!sessionId) return;

        try {
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_auto_reply',
                    sessionId,
                    enabled
                })
            });

            const data = await response.json();

            if (data.success) {
                setAutoReplyEnabled(enabled);
                toast({
                    description: `AI自动回复已${enabled ? '启用' : '禁用'}`
                });
            } else {
                throw new Error(data.error || '设置自动回复失败');
            }
        } catch (error) {
            console.error('Failed to set auto-reply:', error);
            toast({
                title: "错误",
                description: `设置自动回复失败: ${error instanceof Error ? error.message : '未知错误'}`,
                variant: "destructive",
            });
        }
    };

    // 同步聊天记录
    const handleSyncChatHistory = async () => {
        if (!sessionId) return;

        setStatus('syncing');

        try {
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync_chat_history',
                    sessionId,
                    limit: 50
                })
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    description: `成功同步 ${data.messageCount} 条聊天记录到 inbox`
                });
            } else {
                throw new Error(data.error || '同步聊天记录失败');
            }
        } catch (error) {
            console.error('Failed to sync chat history:', error);
            toast({
                title: "错误",
                description: `同步聊天记录失败: ${error instanceof Error ? error.message : '未知错误'}`,
                variant: "destructive",
            });
        } finally {
            setStatus('idle');
        }
    };

    // 获取会话状态
    const handleGetSessionStatus = async () => {
        if (!sessionId) return;

        try {
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_session_status',
                    sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                setSessionStatus(data.status);

                // 获取自动回复状态
                const autoReplyResponse = await fetch('/api/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get_auto_reply_status',
                        sessionId
                    })
                });

                const autoReplyData = await autoReplyResponse.json();
                if (autoReplyData.success) {
                    setAutoReplyEnabled(autoReplyData.enabled);
                }
            }
        } catch (error) {
            console.error('Failed to get session status:', error);
        }
    };

    // 当会话创建后获取状态
    useEffect(() => {
        if (sessionId) {
            handleGetSessionStatus();
        }
    }, [sessionId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>连接 Telegram</DialogTitle>
                    <DialogDescription>
                        使用 GramJS 连接您的 Telegram 账户
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* API Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-blue-900">获取 API 信息</p>
                                <p className="text-xs text-blue-700">
                                    需要从 Telegram 开发者平台获取 API ID 和 API Hash
                                </p>
                                <Button
                                    variant="link"
                                    className="h-auto p-0 text-xs text-blue-600"
                                    onClick={handleGetAPIInfo}
                                >
                                    点击这里获取 API 信息 →
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* API ID and Hash */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="apiId">API ID</Label>
                            <Input
                                id="apiId"
                                type="number"
                                value={apiId}
                                onChange={(e) => setApiId(e.target.value)}
                                placeholder="输入您的 API ID"
                                disabled={status !== 'idle' || !!sessionId}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="apiHash">API Hash</Label>
                            <Input
                                id="apiHash"
                                value={apiHash}
                                onChange={(e) => setApiHash(e.target.value)}
                                placeholder="输入您的 API Hash"
                                disabled={status !== 'idle' || !!sessionId}
                            />
                        </div>

                        {!sessionId && (
                            <Button
                                onClick={handleCreateSession}
                                disabled={status === 'creating' || !apiId || !apiHash}
                                className="w-full"
                            >
                                {status === 'creating' ? '创建中...' : '创建会话'}
                            </Button>
                        )}
                    </div>

                    {/* Phone Number */}
                    {sessionId && (
                        <div className="space-y-3 border-t pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">手机号</Label>
                                <Input
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+86 13800138000"
                                    disabled={status === 'starting' || status === 'success'}
                                />
                                <p className="text-xs text-muted-foreground">
                                    请输入完整的国际格式手机号
                                </p>
                            </div>

                            <Button
                                onClick={handleStartSession}
                                disabled={status === 'starting' || status === 'success' || !phoneNumber}
                                className="w-full"
                            >
                                {status === 'starting' ? '连接中...' :
                                    status === 'success' ? '连接成功！' : '开始连接'}
                            </Button>

                            {/* Advanced Features */}
                            {sessionStatus?.isConnected && (
                                <div className="space-y-4 border-t pt-4">
                                    {/* Auto Reply Switch */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="auto-reply" className="text-sm font-medium">
                                                AI自动回复
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                启用后，AI将自动回复收到的消息
                                            </p>
                                        </div>
                                        <Switch
                                            id="auto-reply"
                                            checked={autoReplyEnabled}
                                            onCheckedChange={handleToggleAutoReply}
                                        />
                                    </div>

                                    {/* Sync Chat History */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            同步聊天记录
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            将现有的Telegram聊天记录同步到inbox
                                        </p>
                                        <Button
                                            onClick={handleSyncChatHistory}
                                            disabled={status === 'syncing'}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {status === 'syncing' ? '同步中...' : '同步聊天记录'}
                                        </Button>
                                    </div>

                                    {/* Session Info */}
                                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-gray-900">会话信息</p>
                                            <p className="text-xs text-gray-600">
                                                会话已保存，下次启动无需重新登录
                                            </p>
                                            {sessionStatus?.phoneNumber && (
                                                <p className="text-xs text-gray-600">
                                                    已连接: {sessionStatus.phoneNumber}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Display */}
                    {status === 'success' && (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="text-sm text-green-800">Telegram 连接成功！</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <p className="text-sm text-red-800">连接失败，请检查信息后重试</p>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">连接步骤：</h4>
                        <ol className="text-sm text-muted-foreground space-y-1">
                            <li>1. 访问 Telegram 开发者平台获取 API ID 和 Hash</li>
                            <li>2. 填写 API 信息并创建会话</li>
                            <li>3. 输入手机号开始连接</li>
                            <li>4. 在手机上确认登录（可能需要输入验证码）</li>
                        </ol>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={status === 'starting' || status === 'success'}
                    >
                        取消
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
