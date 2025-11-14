'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { updateChannel, deleteChannel, getAIAgents } from '@/lib/api';
import { clientFirestoreService } from '@/lib/client-firestore-service';
import type { Channel, AIAgent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import { channelIcons } from '@/lib/data';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

// 此组件处理编辑渠道的客户端逻辑。
export default function ChannelEditForm({ channel: initialChannel }: { channel: Channel }) {
  const [channel, setChannel] = useState<Channel>(initialChannel);
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: initialChannel.name,
    autoReply: initialChannel.autoReply || false,
    agentId: initialChannel.agentId || '',
    phoneNumber: initialChannel.phoneNumber || '',
    description: initialChannel.description || '',
    apiKey: '',
    apiSecret: '',
    webhookUrl: ''
  });

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Load AI agents
    const loadAIAgents = async () => {
      try {
        const agents = await getAIAgents();
        setAIAgents(agents);
      } catch (error) {
        console.error('Error loading AI agents:', error);
      }
    };

    loadAIAgents();

    // 根据渠道类型设置模拟凭据以供演示
    if (channel.type === 'WhatsApp' && !formData.phoneNumber) {
      setFormData(prev => ({ ...prev, phoneNumber: channel.phoneNumber || '' }));
    }
    if (channel.type === 'Telegram' && !formData.apiKey) {
      setFormData(prev => ({ ...prev, apiKey: 'TG-abcdef123456' }));
    }
  }, [channel.type, channel.phoneNumber, formData.phoneNumber]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        autoReply: formData.autoReply,
        agentId: formData.agentId || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        description: formData.description || undefined
      };

      const updatedChannel = await updateChannel(channel.id, updateData);
      setChannel(updatedChannel);

      // 保存到 Firestore
      try {
        const firestoreChannel = {
          id: updatedChannel.id,
          name: updatedChannel.name,
          type: updatedChannel.type,
          status: updatedChannel.status,
          lastActivity: updatedChannel.lastActivity,
          agentId: updatedChannel.agentId,
          autoReply: updatedChannel.autoReply,
          phoneNumber: updatedChannel.phoneNumber,
          description: updatedChannel.description,
          updatedAt: new Date().toISOString()
        };

        await clientFirestoreService.saveChannel(firestoreChannel);
      } catch (firestoreError) {
        console.error('Failed to save to Firestore:', firestoreError);
        // Don't fail the whole operation for Firestore errors
      }

      toast({
        title: '渠道已更新',
        description: `成功更新 "${formData.name}"。`,
      });
      router.push('/channels');
    } catch (error) {
      console.error('Error updating channel:', error);
      toast({
        variant: 'destructive',
        title: '错误',
        description: '更新渠道失败。',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteChannel(channel.id);
      if (result.success) {
        toast({
          title: '渠道已删除',
          description: `渠道 "${channel.name}" 已成功删除。`,
        });
        router.push('/channels');
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: '删除渠道时发生错误。',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge
        variant="outline"
        className={cn(
          status === "online" &&
          "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-300 dark:border-green-800",
          status === "offline" &&
          "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400 border-gray-300 dark:border-gray-700",
          status === "error" &&
          "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-300 dark:border-red-800"
        )}
      >
        <span
          className={cn(
            "mr-1.5 h-2 w-2 rounded-full",
            status === "online" && "bg-green-600",
            status === "offline" && "bg-gray-500",
            status === "error" && "bg-red-600"
          )}
        />
        {status}
      </Badge>
    );
  };

  const renderCredentials = () => {
    switch (channel.type) {
      case 'WhatsApp':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">电话号码</Label>
              <Input
                id="phone"
                value={formData.phoneNumber}
                onChange={e => handleInputChange('phoneNumber', e.target.value)}
                placeholder="例如, +1234567890"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                连接时自动获取，也可以手动设置
              </p>
            </div>
          </div>
        );
      case 'Telegram':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Bot Token</Label>
              <Input
                id="api-key"
                type="password"
                value={formData.apiKey}
                onChange={e => handleInputChange('apiKey', e.target.value)}
                placeholder="输入 Telegram Bot Token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                value={formData.webhookUrl}
                onChange={e => handleInputChange('webhookUrl', e.target.value)}
                placeholder="https://yourdomain.com/webhook/telegram"
              />
            </div>
          </div>
        );
      case 'Facebook':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Page Access Token</Label>
              <Input
                id="api-key"
                type="password"
                value={formData.apiKey}
                onChange={e => handleInputChange('apiKey', e.target.value)}
                placeholder="输入 Facebook Page Access Token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-secret">App Secret</Label>
              <Input
                id="api-secret"
                type="password"
                value={formData.apiSecret}
                onChange={e => handleInputChange('apiSecret', e.target.value)}
                placeholder="输入 Facebook App Secret"
              />
            </div>
          </div>
        );
      case 'WeChat':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                微信连接通过扫描二维码自动配置，无需手动输入凭据。
              </p>
            </div>
          </div>
        );
      case 'Widget':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Widget 嵌入代码</Label>
              <Textarea
                id="webhook-url"
                value={`<script src="/widget.js" data-channel="${channel.id}"></script>`}
                readOnly
                className="font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                将此代码嵌入到您的网站中以启用聊天小部件
              </p>
            </div>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">此渠道类型不需要特殊凭据。</p>;
    }
  }

  const Icon = channelIcons[channel.type];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild>
            <Link href="/channels" className="mb-4 inline-flex items-center gap-2 text-sm">
              <ChevronLeft className="h-4 w-4" />
              返回渠道列表
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-6 w-6" />}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">编辑渠道</h1>
              <p className="text-muted-foreground">管理 {channel.name} 的设置。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存更改'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={deleting}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <VisuallyHidden>
                  <AlertDialogTitle>Hidden Title</AlertDialogTitle>
                </VisuallyHidden>
                <AlertDialogTitle>确认删除渠道</AlertDialogTitle>
                <AlertDialogDescription>
                  您确定要删除渠道 "{channel.name}" 吗？
                  此操作将永久删除所有相关配置和历史记录，无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                >
                  {deleting ? '删除中...' : '确认删除'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本设置 */}
        <Card>
          <CardHeader>
            <CardTitle>基本设置</CardTitle>
            <CardDescription>更新此渠道的基本信息。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">渠道名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>渠道类型</Label>
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{channel.type}</span>
              </div>
              <p className="text-xs text-muted-foreground">类型创建后无法修改</p>
            </div>

            <div className="space-y-2">
              <Label>状态</Label>
              <div>
                {getStatusBadge(channel.status)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="输入渠道描述（可选）"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI 设置 */}
        <Card>
          <CardHeader>
            <CardTitle>AI 智能体设置</CardTitle>
            <CardDescription>配置自动回复和 AI 智能体绑定。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>自动回复</Label>
                <p className="text-sm text-muted-foreground">
                  启用后将自动回复收到的消息
                </p>
              </div>
              <Switch
                checked={formData.autoReply}
                onCheckedChange={(checked) => handleInputChange('autoReply', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent">绑定 AI 智能体</Label>
              <Select
                value={formData.agentId || "none"}
                onValueChange={(value) => handleInputChange('agentId', value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一个 AI 智能体" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无绑定</SelectItem>
                  {aiAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex flex-col text-left">
                        <span>{agent.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agent.provider} - {agent.model}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.agentId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">AI 自动回复已启用</p>
                    <p className="text-xs text-blue-700">
                      所有通过此渠道收到的消息都将由选定的 AI 智能体自动回复
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 连接设置 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>连接设置</CardTitle>
            <CardDescription>
              配置连接到 {channel.type} 所需的凭据和设置。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderCredentials()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
