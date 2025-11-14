import type { LucideIcon } from 'lucide-react';

export type User = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role?: 'admin' | 'agent';
  balance?: number;
};

export type ChannelType = 'WhatsApp' | 'Telegram' | 'Facebook' | 'Widget' | 'WeChat' | 'MiChat';

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  status: 'online' | 'offline' | 'error';
  lastActivity: string;
  agentId?: string;
  autoReply: boolean;
  phoneNumber?: string;
  description?: string;
};

export type Message = {
  id: string;
  from: 'customer' | 'agent';
  text: string;
  timestamp: string;
  read: boolean;
};

export type Conversation = {
  id: string;
  customer: {
    name: string;
    avatar: string;
  };
  channel: {
    id: string;
    name: string;
    type: ChannelType;
  };
  startTime: string;
  status: 'open' | 'closed';
  agent: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  summary: string;
  messages: Message[];
};

export type AIAgent = {
  id: string;
  name: string;
  description?: string;
  provider?: 'OpenAI' | 'DeepSeek' | 'Gemini';
  prompt: string;
  model: string;
  channelIds?: string[];
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
};

export type FileItem = {
  id: string;
  type: 'folder' | 'image';
  name: string;
  url?: string;
  parentId?: string | null;
};

export type AISettings = {
  provider: 'google-ai' | 'openai' | 'anthropic' | 'deepseek';
  apiKey: string;
  defaultModel: string;
};
