"use client";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode.react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getChannels, getAIAgents, updateChannel, addChannel, deleteChannel } from "@/lib/api";
import type { Channel, AIAgent, ChannelType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { channelIcons } from "@/lib/data";
import { clientFirestoreService } from "@/lib/client-firestore-service";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { MobileChannelsView } from "./mobile-view";
import { TelegramDialog } from "./telegram-dialog";

function AddChannelDialog({
  onAddChannel,
}: {
  onAddChannel: (newChannel: Channel) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) return;

    const newChannel = await addChannel({ name, type });
    onAddChannel(newChannel);
    setOpen(false);
    setName("");
    setType("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          添加渠道
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>添加新渠道</DialogTitle>
            <DialogDescription>
              将新的沟通渠道连接到您的工作区。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                名称
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="我的新渠道"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                类型
              </Label>
              <Select
                onValueChange={(value) => setType(value as Channel["type"])}
                value={type}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择渠道类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Telegram">Telegram</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="WeChat">微信</SelectItem>
                  <SelectItem value="MiChat">MiChat</SelectItem>
                  <SelectItem value="Widget">网站小部件</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">添加渠道</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WhatsAppQRDialog({
  qr,
  qrId,
  open,
  onOpenChange,
  onConnectionSuccess,
}: {
  qr: string | null;
  qrId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionSuccess?: () => void;
}) {
  const [status, setStatus] = useState<'generating' | 'ready' | 'scanning' | 'success' | 'expired' | 'error'>('generating');
  const [countdown, setCountdown] = useState(60);
  const [instructions, setInstructions] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setStatus('generating');
      setCountdown(60);
      return;
    }

    if (qr) {
      setStatus('ready');
      // Start checking for scan status
      const pollInterval = setInterval(async () => {
        if (qrId) {
          try {
            const response = await fetch('/api/whatsapp/qr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qrId, action: 'check-status' })
            });
            const data = await response.json();

            if (data.status === 'confirmed') {
              setStatus('success');
              clearInterval(pollInterval);
              setTimeout(() => {
                onConnectionSuccess?.();
                onOpenChange(false);
              }, 2000);
            }
          } catch (error) {
            console.error('Failed to check QR status:', error);
          }
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [qr, qrId, open, onConnectionSuccess, onOpenChange]);

  useEffect(() => {
    if (status === 'ready' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, countdown]);

  const handleRefreshQR = async () => {
    setStatus('generating');
    setCountdown(60);
    // Trigger QR regeneration by calling parent component's refresh logic
    window.location.reload(); // Simple approach, could be improved
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>连接 WhatsApp</DialogTitle>
          <DialogDescription>
            使用 Bailey 客户端扫描二维码连接您的 WhatsApp 账户
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
            {status === 'generating' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">正在生成二维码...</p>
              </div>
            )}

            {status === 'ready' && qr && (
              <div className="text-center">
                <QRCode value={qr} size={220} level="M" />
                <div className="mt-2 text-sm text-muted-foreground">
                  有效时间: {formatTime(countdown)}
                </div>
              </div>
            )}

            {status === 'scanning' && (
              <div className="text-center">
                <div className="animate-pulse">
                  <QRCode value={qr || ''} size={220} level="M" />
                </div>
                <p className="text-sm text-green-600 mt-2">正在扫描...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="rounded-full bg-green-100 p-4 mb-2">
                  <svg className="w-8 h-8 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">连接成功！</p>
                <p className="text-sm text-muted-foreground">正在初始化 WhatsApp 客户端...</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="text-center">
                <div className="rounded-full bg-red-100 p-4 mb-2">
                  <svg className="w-8 h-8 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">二维码已过期</p>
                <Button onClick={handleRefreshQR} className="mt-2" size="sm">
                  重新生成
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="rounded-full bg-red-100 p-4 mb-2">
                  <svg className="w-8 h-8 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">连接失败</p>
                <Button onClick={handleRefreshQR} className="mt-2" size="sm">
                  重试
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          {(status === 'ready' || status === 'scanning') && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">连接步骤：</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. 在手机上打开 WhatsApp</li>
                <li>2. 点击右上角的三个点，选择"已连接的设备"</li>
                <li>3. 点击"连接设备"</li>
                <li>4. 扫描上方二维码</li>
              </ol>
            </div>
          )}

          {/* Bailey Info */}
          {status === 'ready' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">使用 Bailey 库</p>
                  <p className="text-xs text-blue-700">这是一个开源的 WhatsApp Web API 库，支持完整的消息功能</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === 'success'}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WeChatQRDialog({
  qr,
  open,
  onOpenChange,
  onConnectionSuccess,
}: {
  qr: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionSuccess?: () => void;
}) {
  const [status, setStatus] = useState<'generating' | 'ready' | 'scanned' | 'success' | 'expired' | 'error'>('generating');
  const [countdown, setCountdown] = useState(120); // WeChat QR lasts 2 minutes
  const [qrId, setQrId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStatus('generating');
      setCountdown(120);
      setQrId(null);
      return;
    }

    if (qr) {
      setStatus('ready');
      // Start checking for scan status
      const pollInterval = setInterval(async () => {
        if (qrId) {
          try {
            const response = await fetch('/api/wechat/qr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qrId, action: 'check-status' })
            });
            const data = await response.json();

            if (data.status === 'confirmed') {
              setStatus('success');
              clearInterval(pollInterval);
              setTimeout(() => {
                onConnectionSuccess?.();
                onOpenChange(false);
              }, 2000);
            } else if (data.status === 'scanned') {
              setStatus('scanned');
            }
          } catch (error) {
            console.error('Failed to check WeChat QR status:', error);
          }
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [qr, qrId, open, onConnectionSuccess, onOpenChange]);

  useEffect(() => {
    if (status === 'ready' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, countdown]);

  const handleRefreshQR = async () => {
    setStatus('generating');
    setCountdown(120);
    try {
      const response = await fetch('/api/wechat/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });
      const data = await response.json();
      if (data.success && data.qr) {
        setQrId(data.qrId);
        // The parent component should update the QR code
        window.location.reload(); // Simple approach
      }
    } catch (error) {
      console.error('Failed to refresh WeChat QR:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>连接微信</DialogTitle>
          <DialogDescription>
            扫描二维码连接您的微信公众号或个人号
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="flex items-center justify-center p-4 bg-white rounded-lg border">
            {status === 'generating' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">正在生成微信二维码...</p>
              </div>
            )}

            {status === 'ready' && qr && (
              <div className="text-center">
                <QRCode value={qr} size={220} level="M" />
                <div className="mt-2 text-sm text-muted-foreground">
                  有效时间: {formatTime(countdown)}
                </div>
              </div>
            )}

            {status === 'scanned' && (
              <div className="text-center">
                <div className="animate-pulse">
                  <QRCode value={qr || ''} size={220} level="M" />
                </div>
                <p className="text-sm text-yellow-600 mt-2">已扫描，请在手机上确认</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <div className="rounded-full bg-green-100 p-4 mb-2">
                  <svg className="w-8 h-8 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-medium">微信连接成功！</p>
                <p className="text-sm text-muted-foreground">正在初始化机器人...</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="text-center">
                <div className="rounded-full bg-red-100 p-4 mb-2">
                  <svg className="w-8 h-8 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">二维码已过期</p>
                <Button onClick={handleRefreshQR} className="mt-2" size="sm">
                  重新生成
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <div className="rounded-full bg-red-100 p-4 mb-2">
                  <svg className="w-8 h-8 text-red-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">连接失败</p>
                <Button onClick={handleRefreshQR} className="mt-2" size="sm">
                  重试
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          {(status === 'ready' || status === 'scanned') && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">连接步骤：</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. 打开微信 APP</li>
                <li>2. 点击右上角"+"号</li>
                <li>3. 选择"扫一扫"</li>
                <li>4. 扫描上方二维码</li>
                <li>5. 在手机上确认登录</li>
              </ol>
            </div>
          )}

          {/* WeChat Info */}
          {status === 'ready' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-900">微信集成</p>
                  <p className="text-xs text-green-700">支持公众号、个人号多种连接方式，完整消息收发功能</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === 'success'}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const { toast } = useToast();
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const router = useRouter();
  // WhatsApp QR states
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  // WeChat QR states
  const [wechatQR, setWechatQR] = useState<string | null>(null);
  const [isWechatQRDialogOpen, setIsWechatQRDialogOpen] = useState(false);

  // Telegram states
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [connectingTelegramChannel, setConnectingTelegramChannel] = useState<string | null>(null);

  const isMobile = useMobile();

  useEffect(() => {
    const fetchData = async () => {
      const [channelsData, agentsData] = await Promise.all([
        getChannels(),
        getAIAgents(),
      ]);

      // Check for duplicate IDs in fetched data
      const channelIds = channelsData.map(ch => ch.id);
      const uniqueChannelIds = new Set(channelIds);

      if (channelIds.length !== uniqueChannelIds.size) {
        console.warn('Duplicate channel IDs detected in fetched data:', channelIds);
        // Filter out duplicates, keeping the first occurrence
        const seenIds = new Set();
        const uniqueChannels = channelsData.filter(ch => {
          if (seenIds.has(ch.id)) {
            console.warn(`Removing duplicate channel: ${ch.id} - ${ch.name}`);
            return false;
          }
          seenIds.add(ch.id);
          return true;
        });
        setChannels(uniqueChannels);
      } else {
        setChannels(channelsData);
      }

      setAIAgents(agentsData);
    };
    fetchData();
  }, []);

  const handleConnect = async (channelId: string, type: Channel["type"]) => {
    setConnecting((prev) => ({ ...prev, [channelId]: true }));
    toast({ description: `正在连接到 ${type}...` });

    if (type === "WhatsApp") {
      setIsQrDialogOpen(true);
      setQrCode(null);
      setQrId(null);
      try {
        // Get QR code from Bailey-enhanced API
        const response = await fetch("/api/whatsapp/qr");
        const data = await response.json();

        if (response.ok && data.success) {
          setQrCode(data.qr);
          setQrId(data.qrId);

          toast({
            description: `WhatsApp 二维码已生成，请在 ${data.expiresIn || 60} 秒内扫描`,
          });

        } else {
          throw new Error(data.message || "获取二维码失败");
        }
      } catch (error) {
        console.error("获取 WhatsApp 二维码失败:", error);
        toast({
          title: "错误",
          description: `获取二维码失败: ${error instanceof Error ? error.message : '未知错误'}`,
          variant: "destructive",
        });
        setIsQrDialogOpen(false);
        setConnecting((prev) => ({ ...prev, [channelId]: false }));
      }
    } else if (type === "WeChat") {
      setIsWechatQRDialogOpen(true);
      setWechatQR(null);
      try {
        // Get QR code from WeChat API
        const response = await fetch("/api/wechat/qr");
        const data = await response.json();

        if (response.ok && data.success) {
          setWechatQR(data.qr);

          // Store QR metadata for status checking
          if (data.qrId) {
            console.log(`WeChat QR generated: ${data.qrId}`);
          }

          toast({
            description: `微信二维码已生成，请在 ${data.expiresIn || 120} 秒内扫描`,
          });

        } else {
          throw new Error(data.message || "获取二维码失败");
        }
      } catch (error) {
        console.error("获取微信二维码失败:", error);
        toast({
          title: "错误",
          description: `获取二维码失败: ${error instanceof Error ? error.message : '未知错误'}`,
          variant: "destructive",
        });
        setIsWechatQRDialogOpen(false);
        setConnecting((prev) => ({ ...prev, [channelId]: false }));
      }
    } else if (type === "Telegram") {
      // Open Telegram dialog for API credentials and phone number
      setIsTelegramDialogOpen(true);
      setConnectingTelegramChannel(channelId);
    }

    // Don't set connecting to false here for WhatsApp and WeChat, let the dialog handle it
    if (type !== "WhatsApp" && type !== "WeChat") {
      setConnecting((prev) => ({ ...prev, [channelId]: false }));
    }
  };

  const handleWhatsAppConnectionSuccess = async () => {
    // This will be called when QR scan is successful
    const whatsappChannel = channels.find(ch => ch.type === "WhatsApp" && connecting[ch.id]);

    if (whatsappChannel) {
      try {
        // Get connection info first to extract phone number
        let phoneNumber = null;
        if (qrId) {
          const response = await fetch("/api/whatsapp/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "confirm-connection",
              channelId: whatsappChannel.id,
              qrId: qrId
            })
          });

          if (response.ok) {
            const responseData = await response.json();
            phoneNumber = responseData.data?.phoneNumber;
            await initializeChannelAI(whatsappChannel.id, responseData.data || {});
          }
        }

        // Update channel status with phone number
        const updatedChannel = await updateChannel(whatsappChannel.id, {
          status: "online",
          lastActivity: "刚刚",
          ...(phoneNumber && { phoneNumber })
        });

        setChannels((prev) =>
          prev.map((ch) => (ch.id === whatsappChannel.id ? updatedChannel : ch))
        );

        // Load chat history after connection
        try {
          const historyResponse = await fetch(`/api/whatsapp/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channelId: whatsappChannel.id,
              sessionId: qrId,
              limit: 50
            })
          });

          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log(`Loaded WhatsApp chat history: ${historyData.data.totalConversations} conversations, ${historyData.data.totalMessages} messages`);

            toast({
              description: `WhatsApp 已成功连接！已加载 ${historyData.data.totalMessages} 条历史消息，${historyData.data.totalConversations} 个对话。`,
              duration: 5000
            });
          } else {
            throw new Error('Failed to load chat history');
          }
        } catch (historyError) {
          console.error('Failed to load WhatsApp chat history:', historyError);
          toast({
            description: "WhatsApp 已成功连接！Bailey 客户端已就绪，AI智能体已启用。",
            duration: 5000
          });
        }

      } catch (error) {
        console.error("确认 WhatsApp 连接失败:", error);
        toast({
          title: "连接确认失败",
          description: "扫描成功，但服务器确认失败，请重试。",
          variant: "destructive",
        });
      } finally {
        setConnecting((prev) => ({ ...prev, [whatsappChannel.id]: false }));
      }
    }
  };

  const handleWeChatConnectionSuccess = async () => {
    // Find the WeChat channel that's connecting
    const wechatChannels = channels.filter(ch => ch.type === "WeChat");
    const connectingWechatChannels = wechatChannels.filter(ch => connecting[ch.id]);

    if (connectingWechatChannels.length > 0) {
      const wechatChannel = connectingWechatChannels[0];

      try {
        // Confirm connection with backend
        const response = await fetch("/api/wechat/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm-connection",
            channelId: wechatChannel.id
          })
        });

        if (response.ok) {
          const responseData = await response.json();
          const phoneNumber = responseData.data?.phoneNumber;

          const updatedChannel = await updateChannel(wechatChannel.id, {
            status: "online",
            lastActivity: "刚刚",
            ...(phoneNumber && { phoneNumber })
          });

          setChannels((prev) =>
            prev.map((ch) => (ch.id === wechatChannel.id ? updatedChannel : ch))
          );

          // Initialize AI agent for this channel
          await initializeChannelAI(wechatChannel.id, responseData.data);

          // Load chat history after connection
          try {
            const historyResponse = await fetch(`/api/chat/history?channelId=${wechatChannel.id}&limit=50`);
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              console.log(`Loaded WeChat chat history: ${historyData.data.totalConversations} conversations, ${historyData.data.totalMessages} messages`);

              toast({
                description: `微信已成功连接！已加载 ${historyData.data.totalConversations} 个对话历史记录。`,
                duration: 5000
              });
            } else {
              throw new Error('Failed to load chat history');
            }
          } catch (historyError) {
            console.error('Failed to load WeChat chat history:', historyError);
            toast({
              description: "微信已成功连接！机器人已就绪，AI智能体已启用。",
              duration: 5000
            });
          }
        }
      } catch (error) {
        console.error("确认微信连接失败:", error);
        toast({
          title: "连接确认失败",
          description: "扫描成功，但服务器确认失败，请重试。",
          variant: "destructive",
        });
      } finally {
        setConnecting((prev) => ({ ...prev, [wechatChannel.id]: false }));
      }
    }
  };

  // Initialize AI agent for newly connected channel
  const initializeChannelAI = async (channelId: string, connectionData: any) => {
    try {
      console.log(`Initializing AI for channel: ${channelId}`);

      // Assign a default AI agent (customer-support) to the new channel
      const defaultAgentId = "customer-support";

      // Update channel to enable auto-reply with default agent
      const updatedChannel = await updateChannel(channelId, {
        agentId: defaultAgentId,
        autoReply: true, // Enable auto-reply by default
      });

      // Update local state
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId
            ? { ...ch, agentId: defaultAgentId, autoReply: true }
            : ch
        )
      );

      // Initialize the OmniChat service to ensure AI agents are ready
      const initResponse = await fetch('/api/omnichat/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          connectionData,
          agentId: defaultAgentId
        })
      });

      if (initResponse.ok) {
        console.log(`AI initialized successfully for channel: ${channelId}`);
      } else {
        console.warn(`AI initialization warning for channel: ${channelId}`);
      }

    } catch (error) {
      console.error(`Failed to initialize AI for channel ${channelId}:`, error);
      // Don't fail the connection process for AI initialization errors
    }
  };

  const handleAddChannel = (newChannel: Channel) => {
    // Check if channel with same ID already exists to prevent duplicates
    setChannels((prev) => {
      const exists = prev.some(ch => ch.id === newChannel.id);
      if (exists) {
        console.warn(`Channel with ID ${newChannel.id} already exists, skipping duplicate`);
        return prev;
      }
      return [...prev, newChannel];
    });

    if (newChannel.type === "WhatsApp" || newChannel.type === "WeChat") {
      handleConnect(newChannel.id, newChannel.type);
    }
  };

  const handleAgentChange = async (channelId: string, agentId: string) => {
    const newAgentId = agentId === "none" ? undefined : agentId;

    // When binding an agent to a channel, automatically enable auto-reply
    const autoReply = newAgentId ? true : false;

    try {
      // Update channel with both agent assignment and auto-reply setting
      const updatedChannel = await updateChannel(channelId, {
        agentId: newAgentId,
        autoReply: autoReply
      });

      setChannels((prev) =>
        prev.map((ch) => (ch.id === channelId ? updatedChannel : ch))
      );

      // 保存更新到 Firestore
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
          connectedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await clientFirestoreService.saveChannel(firestoreChannel);
        console.log(`Channel agent binding saved to Firestore: ${channelId}`);
      } catch (firestoreError) {
        console.error('Failed to save channel update to Firestore:', firestoreError);
        // 不影响用户体验，只记录错误
      }

      if (newAgentId) {
        // Get agent info to show in toast
        const agent = aiAgents.find(a => a.id === newAgentId);
        const agentName = agent ? agent.name : '智能体';

        toast({
          description: `已将 "${agentName}" 绑定到该渠道并启用 AI 自动回复。该渠道收到的所有消息将由 AI 智能体自动回复。`,
          duration: 5000
        });

        // Log the binding for debugging
        console.log(`AI Agent "${agentName}" (${newAgentId}) bound to channel ${channelId} with auto-reply enabled`);
      } else {
        toast({
          description: "已取消智能体绑定并禁用自动回复。"
        });
        console.log(`AI Agent unbound from channel ${channelId} and auto-reply disabled`);
      }
    } catch (error) {
      console.error('Failed to update channel agent:', error);
      toast({
        title: "错误",
        description: "更新渠道智能体失败，请重试。",
        variant: "destructive",
      });
    }
  };

  const handleAutoReplyToggle = async (channelId: string, enabled: boolean) => {
    await updateChannel(channelId, { autoReply: enabled });
    setChannels((prev) =>
      prev.map((ch) => (ch.id === channelId ? { ...ch, autoReply: enabled } : ch))
    );
    toast({ description: `自动回复已${enabled ? "启用" : "禁用"}。` });
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const result = await deleteChannel(channelId);
      if (result.success) {
        setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
        toast({
          description: "渠道已成功删除。"
        });
      } else {
        toast({
          title: "错误",
          description: "删除渠道失败。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("删除渠道失败:", error);
      toast({
        title: "错误",
        description: "删除渠道时发生错误。",
        variant: "destructive",
      });
    }
  };

  const handleTelegramConnectionSuccess = async () => {
    if (connectingTelegramChannel) {
      try {
        // Update channel status to online
        const updatedChannel = await updateChannel(connectingTelegramChannel, {
          status: "online",
          lastActivity: "刚刚",
        });

        setChannels((prev) =>
          prev.map((ch) => (ch.id === connectingTelegramChannel ? updatedChannel : ch))
        );

        // Initialize AI agent for this channel
        await initializeChannelAI(connectingTelegramChannel, {});

        toast({
          description: "Telegram 已成功连接！GramJS 客户端已就绪，AI智能体已启用。",
          duration: 5000
        });

      } catch (error) {
        console.error("确认 Telegram 连接失败:", error);
        toast({
          title: "连接确认失败",
          description: "连接成功，但服务器确认失败，请重试。",
          variant: "destructive",
        });
      } finally {
        setConnecting((prev) => ({ ...prev, [connectingTelegramChannel]: false }));
        setConnectingTelegramChannel(null);
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>渠道</CardTitle>
            <CardDescription>
              管理您连接的沟通渠道。
            </CardDescription>
          </div>
          <div>
            <AddChannelDialog onAddChannel={handleAddChannel} />
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <MobileChannelsView channels={channels} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>渠道</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>最后活动</TableHead>
                  <TableHead>分配的代理</TableHead>
                  <TableHead>自动回复</TableHead>
                  <TableHead>
                    <span className="sr-only">操作</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel, index) => {
                  const Icon = channelIcons[channel.type];
                  return (
                    <TableRow key={`channel-${channel.id}-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {Icon && (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span>{channel.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{channel.type}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {channel.phoneNumber && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {channel.phoneNumber}
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              channel.status === "online" &&
                              "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-300 dark:border-green-800",
                              channel.status === "offline" &&
                              "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-400 border-gray-300 dark:border-gray-700",
                              channel.status === "error" &&
                              "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border-red-300 dark:border-red-800"
                            )}
                          >
                            <span
                              className={cn(
                                "mr-1.5 h-2 w-2 rounded-full",
                                channel.status === "online" && "bg-green-600",
                                channel.status === "offline" && "bg-gray-500",
                                channel.status === "error" && "bg-red-600"
                              )}
                            />
                            {channel.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{channel.lastActivity}</TableCell>
                      <TableCell>
                        <Select
                          value={channel.agentId || "none"}
                          onValueChange={(agentId) =>
                            handleAgentChange(channel.id, agentId)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="选择一个代理" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">无</SelectItem>
                            {aiAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={channel.autoReply}
                          onCheckedChange={(enabled) =>
                            handleAutoReplyToggle(channel.id, enabled)
                          }
                          aria-label="切换自动回复"
                        />
                      </TableCell>
                      <TableCell>
                        {(channel.type === "WhatsApp" ||
                          channel.type === "WeChat" ||
                          channel.type === "Telegram") &&
                          channel.status !== "online" && (
                            <Button
                              size="sm"
                              onClick={() => handleConnect(channel.id, channel.type)}
                              disabled={connecting[channel.id]}
                            >
                              {connecting[channel.id] ? "连接中..." : "连接"}
                            </Button>
                          )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">切换菜单</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/channels/${channel.id}`)
                              }
                            >
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem>刷新</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={(e) => e.preventDefault()}
                                >
                                  删除
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    您确定要删除渠道 "{channel.name}" 吗？
                                    此操作无法撤销，所有相关的配置和历史记录都将被永久删除。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteChannel(channel.id)}
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <WhatsAppQRDialog
        qr={qrCode}
        qrId={qrId}
        open={isQrDialogOpen}
        onOpenChange={setIsQrDialogOpen}
        onConnectionSuccess={handleWhatsAppConnectionSuccess}
      />
      <WeChatQRDialog
        qr={wechatQR}
        open={isWechatQRDialogOpen}
        onOpenChange={setIsWechatQRDialogOpen}
        onConnectionSuccess={handleWeChatConnectionSuccess}
      />
      <TelegramDialog
        open={isTelegramDialogOpen}
        onOpenChange={setIsTelegramDialogOpen}
        onConnectionSuccess={handleTelegramConnectionSuccess}
        channelId={connectingTelegramChannel || ""}
      />
    </>
  );
}
