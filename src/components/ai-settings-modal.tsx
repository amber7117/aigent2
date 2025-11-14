import React, { useState, useEffect } from 'react';
import {
    Settings,
    Key,
    TestTube,
    Check,
    X,
    Loader2,
    Eye,
    EyeOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAISettings, saveAISettings } from '@/lib/api';
import { aiService } from '@/lib/ai-service';
import type { AISettings } from '@/lib/types';

interface AISettingsModalProps {
    onClose: () => void;
}

export function AISettingsModal({ onClose }: AISettingsModalProps) {
    const [settings, setSettings] = useState<AISettings>({
        provider: 'google-ai',
        apiKey: '',
        defaultModel: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const { toast } = useToast();

    const providerOptions = [
        { value: 'google-ai', label: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'] },
        { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'] },
        { value: 'anthropic', label: 'Anthropic Claude', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
        { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
    ];

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const currentSettings = await getAISettings();
                setSettings(currentSettings);
                if (!currentSettings.defaultModel) {
                    // 设置默认模型
                    const provider = providerOptions.find(p => p.value === currentSettings.provider);
                    if (provider) {
                        setSettings(prev => ({ ...prev, defaultModel: provider.models[0] }));
                    }
                }
            } catch (error) {
                console.error('Failed to load AI settings:', error);
                toast({
                    variant: "destructive",
                    description: "加载 AI 设置失败"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleProviderChange = (provider: string) => {
        const providerConfig = providerOptions.find(p => p.value === provider);
        setSettings(prev => ({
            ...prev,
            provider: provider as AISettings['provider'],
            defaultModel: providerConfig?.models[0] || ''
        }));
        setTestResult(null);
    };

    const handleTestConnection = async () => {
        if (!settings.apiKey) {
            toast({
                variant: "destructive",
                description: "请先输入 API Key"
            });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const isValid = await aiService.testAIConfiguration(settings.provider, settings.apiKey);
            setTestResult(isValid ? 'success' : 'error');

            toast({
                description: isValid ? "AI 配置测试成功！" : "AI 配置测试失败，请检查 API Key",
                variant: isValid ? "default" : "destructive"
            });
        } catch (error) {
            setTestResult('error');
            toast({
                variant: "destructive",
                description: "连接测试失败，请检查网络和 API Key"
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!settings.apiKey) {
            toast({
                variant: "destructive",
                description: "请输入 API Key"
            });
            return;
        }

        setSaving(true);
        try {
            await saveAISettings(settings);
            toast({
                description: "AI 设置保存成功！"
            });
            onClose();
        } catch (error) {
            toast({
                variant: "destructive",
                description: "保存设置失败"
            });
        } finally {
            setSaving(false);
        }
    };

    const getCurrentProvider = () => {
        return providerOptions.find(p => p.value === settings.provider);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    const currentProvider = getCurrentProvider();

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-3">
                <Settings className="h-6 w-6" />
                <div>
                    <h2 className="text-xl font-semibold">AI 服务配置</h2>
                    <p className="text-sm text-muted-foreground">
                        配置 AI 提供商和 API Key 以启用智能体功能
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">AI 提供商设置</CardTitle>
                    <CardDescription>
                        选择您想要使用的 AI 服务提供商
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="provider">AI 提供商</Label>
                            <Select value={settings.provider} onValueChange={handleProviderChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择 AI 提供商" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providerOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="model">默认模型</Label>
                            <Select
                                value={settings.defaultModel}
                                onValueChange={(model) => setSettings(prev => ({ ...prev, defaultModel: model }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="选择模型" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currentProvider?.models.map((model) => (
                                        <SelectItem key={model} value={model}>
                                            {model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="apiKey" className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            API Key
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? "text" : "password"}
                                    value={settings.apiKey}
                                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder="输入您的 API Key"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                onClick={handleTestConnection}
                                disabled={testing || !settings.apiKey}
                                variant="outline"
                                className="shrink-0"
                            >
                                {testing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <TestTube className="h-4 w-4" />
                                )}
                                {testing ? '测试中...' : '测试连接'}
                            </Button>
                        </div>

                        {testResult && (
                            <div className="flex items-center gap-2 text-sm">
                                {testResult === 'success' ? (
                                    <>
                                        <Check className="h-4 w-4 text-green-600" />
                                        <span className="text-green-600">连接测试成功</span>
                                    </>
                                ) : (
                                    <>
                                        <X className="h-4 w-4 text-red-600" />
                                        <span className="text-red-600">连接测试失败</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* API Key 获取指南 */}
                    <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                        <h4 className="font-medium mb-2">如何获取 API Key：</h4>
                        <div className="space-y-1 text-muted-foreground">
                            {settings.provider === 'google-ai' && (
                                <>
                                    <p>1. 访问 <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google AI Studio</a></p>
                                    <p>2. 登录您的 Google 账号</p>
                                    <p>3. 创建新的 API Key</p>
                                </>
                            )}
                            {settings.provider === 'openai' && (
                                <>
                                    <p>1. 访问 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">OpenAI API Keys</a></p>
                                    <p>2. 登录您的 OpenAI 账号</p>
                                    <p>3. 创建新的 API Key</p>
                                </>
                            )}
                            {settings.provider === 'anthropic' && (
                                <>
                                    <p>1. 访问 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Anthropic Console</a></p>
                                    <p>2. 登录您的 Anthropic 账号</p>
                                    <p>3. 创建新的 API Key</p>
                                </>
                            )}
                            {settings.provider === 'deepseek' && (
                                <>
                                    <p>1. 访问 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">DeepSeek Platform</a></p>
                                    <p>2. 注册或登录您的账号</p>
                                    <p>3. 创建新的 API Key</p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={onClose}>
                    取消
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving || !settings.apiKey}
                    className="min-w-[100px]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            保存中...
                        </>
                    ) : (
                        '保存设置'
                    )}
                </Button>
            </div>
        </div>
    );
}