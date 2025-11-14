'use client';
import {
  ChevronLeft,
  ChevronsLeftRight,
  PlusCircle,
  Search,
  MessageSquare,
  Send,
} from "lucide-react";
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
import type { Conversation, ChannelType, Channel } from "@/lib/types";
import { WhatsAppLogo } from '@/components/icons/whatsapp-logo';
import { TelegramLogo } from '@/components/icons/telegram-logo';
import { FacebookLogo } from '@/components/icons/facebook-logo';
import { WeChatLogo } from '@/components/icons/wechat-logo';
import { MiChatLogo } from '@/components/icons/michat-logo';
import { getChannels } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const channelColors: Record<ChannelType, string> = {
  WhatsApp: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-300 dark:border-green-800',
  Widget: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border-blue-300 dark:border-blue-800',
  WeChat: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
  MiChat: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 border-orange-300 dark:border-orange-800',
  Telegram: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400 border-sky-300 dark:border-sky-800',
  Facebook: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800',
};

const channelIcons: Record<ChannelType, React.ElementType> = {
  WhatsApp: WhatsAppLogo,
  Telegram: TelegramLogo,
  Facebook: FacebookLogo,
  Widget: MessageSquare,
  WeChat: WeChatLogo,
  MiChat: MiChatLogo,
};

function NewMessageDialog({ open, onOpenChange, channels }: { open: boolean, onOpenChange: (open: boolean) => void, channels: Channel[] }) {
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');

  const getRecipientLabel = () => {
    const channel = channels.find(c => c.id === selectedChannel);
    if (!channel) return "Recipient";
    switch (channel.type) {
      case 'WhatsApp':
        return "WhatsApp Number";
      case 'Telegram':
        return "Telegram User ID";
      default:
        return "Recipient ID";
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({
      channelId: selectedChannel,
      recipient,
      message
    });
    toast({
      title: "Message Sent (Simulated)",
      description: `Your message to ${recipient} has been sent.`,
    });
    onOpenChange(false);
    // Reset form
    setSelectedChannel('');
    setRecipient('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Message</DialogTitle>
            <DialogDescription>
              Select a channel and recipient to start a new conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="channel" className="text-right">
                Channel
              </Label>
              <Select onValueChange={setSelectedChannel} value={selectedChannel}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        {React.createElement(channelIcons[channel.type], { className: 'h-4 w-4' })}
                        <span>{channel.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipient" className="text-right">
                {getRecipientLabel()}
              </Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient details"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="message" className="text-right pt-2">
                Message
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="col-span-3 min-h-[120px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!selectedChannel || !recipient || !message}>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function ConversationList() {
  const isMobile = useMobile();
  const pathname = usePathname();
  const isConversationSelected = pathname.includes('/inbox/') && pathname !== '/inbox';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load channels and conversations
    const loadData = async () => {
      try {
        const [channelsData, conversationsData] = await Promise.all([
          getChannels(),
          fetch('/api/inbox/conversations').then(res => res.json())
        ]);
        setChannels(channelsData);
        setConversations(conversationsData.conversations || []);
      } catch (error) {
        console.error('Error loading inbox data:', error);
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && isConversationSelected && (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/inbox">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <h1 className="text-xl font-bold">收件箱</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <ChevronsLeftRight className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsNewMessageOpen(true)}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索..." className="pl-9" />
          </div>
          <Select defaultValue="unread">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unread">未读</SelectItem>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="archived">已存档</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a new conversation to see it here</p>
          </div>
        ) : (
          conversations.map((conv: Conversation) => {
            const Icon = channelIcons[conv.channel.type];
            return (
              <Link
                href={`/inbox/${conv.id}`}
                key={conv.id}
                className={cn(
                  "block border-b p-4 hover:bg-muted/50",
                  pathname === `/inbox/${conv.id}` && "bg-muted"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={conv.customer.avatar}
                      alt={conv.customer.name}
                      className="h-12 w-12 rounded-full"
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-card",
                        (conv as any).online ? "bg-green-500" : "bg-gray-400"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">{conv.customer.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {conv.messages[conv.messages.length - 1]?.timestamp ?
                          new Date(conv.messages[conv.messages.length - 1].timestamp).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''
                        }
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.messages[conv.messages.length - 1]?.text || 'No messages'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className={cn("gap-1.5", channelColors[conv.channel.type])}>
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                        {conv.channel.name}
                      </Badge>
                      {/* <Badge variant="destructive">{conv.unreadCount}</Badge> */}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      <NewMessageDialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen} channels={channels} />
    </div>
  );
}
