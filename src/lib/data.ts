import type { Channel, AIAgent, User, FileItem, AISettings, ChannelType } from './types';
import { WhatsAppLogo } from '@/components/icons/whatsapp-logo';
import { TelegramLogo } from '@/components/icons/telegram-logo';
import { FacebookLogo } from '@/components/icons/facebook-logo';
import { WeChatLogo } from '@/components/icons/wechat-logo';
import { MiChatLogo } from '@/components/icons/michat-logo';
import { MessageSquare } from 'lucide-react';
import React from 'react';

// Mock Data

export const channelIcons: Record<ChannelType, React.ElementType> = {
  WhatsApp: WhatsAppLogo,
  Telegram: TelegramLogo,
  Facebook: FacebookLogo,
  Widget: MessageSquare,
  WeChat: WeChatLogo,
  MiChat: MiChatLogo,
};

export const users: User[] = [
  { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatar: 'https://i.pravatar.cc/150?u=alice', role: 'admin' },
  { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatar: 'https://i.pravatar.cc/150?u=bob', role: 'agent' },
];

export const loggedInUser: User = {
  ...users[0],
  balance: 123.45,
};

export const aiAgents: AIAgent[] = [
  { id: 'agent-1', name: 'Support Bot', description: "A friendly bot that answers common support questions.", prompt: 'You are a helpful support agent.', model: 'gemini-pro', provider: 'Gemini', channelIds: ['ch-1'] },
  { id: 'agent-2', name: 'Sales Assistant', description: "Assists with sales inquiries and lead qualification.", prompt: 'You are a friendly sales assistant.', model: 'gpt-4', provider: 'OpenAI', channelIds: ['ch-3'] },
];

export const channels: Channel[] = [
  { id: 'ch-1', name: 'WhatsApp Support', type: 'WhatsApp', status: 'online', lastActivity: '5 minutes ago', autoReply: true, agentId: 'agent-1', phoneNumber: '+86 138 0013 8000' },
  { id: 'ch-2', name: 'Website Chat', type: 'Widget', status: 'offline', lastActivity: '2 hours ago', autoReply: false },
  { id: 'ch-3', name: 'WeChat Marketing', type: 'WeChat', status: 'error', lastActivity: '1 day ago', autoReply: true, agentId: 'agent-2', phoneNumber: '+1 555 0123' },
  { id: 'ch-4', name: 'MiChat Support', type: 'MiChat', status: 'offline', lastActivity: '3 days ago', autoReply: false },
];

const dailySeed = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

export const files: FileItem[] = [
  { id: 'file-1', name: 'header-background.jpg', type: 'image', url: `https://picsum.photos/seed/${dailySeed}-1/400/300`, parentId: null },
  { id: 'file-2', name: 'invoice-2024-07.pdf', type: 'image', url: `https://picsum.photos/seed/${dailySeed}-2/400/300`, parentId: null },
  { id: 'folder-1', name: 'Product Images', type: 'folder', parentId: null },
  { id: 'file-3', name: 'logo.png', type: 'image', url: `https://picsum.photos/seed/${dailySeed}-3/400/300`, parentId: 'folder-1' },
  { id: 'file-4', name: 'social-post-1.jpg', type: 'image', url: `https://picsum.photos/seed/${dailySeed}-4/400/300`, parentId: 'folder-1' },
  { id: 'folder-2', name: 'User Avatars', type: 'folder', parentId: null },
  { id: 'file-5', name: 'avatar-jane.jpg', type: 'image', url: `https://picsum.photos/seed/${dailySeed}-5/400/300`, parentId: 'folder-2' },
];

export const aiSettings: AISettings = {
  provider: 'google-ai',
  apiKey: 'YOUR_API_KEY_HERE',
  defaultModel: 'gemini-1.5-flash',
};

// Analytics Data
export const analyticsStats = {
  totalConversations: { value: 1423, change: '+12.5%' },
  avgResponseTime: { value: '2m 45s', change: '-5.2%' },
  satisfactionRate: { value: '92.8%', change: '+1.8%' },
  activeAgents: { value: 8 },
};

export const conversationVolumeData = [
  { hour: '00:00', whatsapp: 10, website: 15 },
  { hour: '02:00', whatsapp: 12, website: 18 },
  { hour: '04:00', whatsapp: 8, website: 14 },
  { hour: '06:00', whatsapp: 15, website: 20 },
  { hour: '08:00', whatsapp: 25, website: 30 },
  { hour: '10:00', whatsapp: 30, website: 45 },
  { hour: '12:00', whatsapp: 40, website: 60 },
  { hour: '14:00', whatsapp: 35, website: 55 },
  { hour: '16:00', whatsapp: 45, website: 65 },
  { hour: '18:00', whatsapp: 50, website: 70 },
  { hour: '20:00', whatsapp: 40, website: 60 },
  { hour: '22:00', whatsapp: 20, website: 35 },
];

export const responseTimeData = [
  { date: 'Mon', time: 2.5 },
  { date: 'Tue', time: 2.8 },
  { date: 'Wed', time: 2.2 },
  { date: 'Thu', time: 3.1 },
  { date: 'Fri', time: 2.9 },
  { date: 'Sat', time: 3.5 },
  { date: 'Sun', time: 3.2 },
];

export const satisfactionData = [
  { month: 'January', rating: 4.5 },
  { month: 'February', rating: 4.2 },
  { month: 'March', rating: 4.6 },
  { month: 'April', rating: 4.8 },
  { month: 'May', rating: 4.7 },
  { month: 'June', rating: 4.9 },
];
