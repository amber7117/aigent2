'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { sendMessage, getAIAgents } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket-service';
import type { Conversation, Message, AIAgent } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Mic,
  Paperclip,
  Send,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Bot,
  User,
  CheckCheck,
  Check,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

// Simulate AI response delay and content
const simulateAIResponse = async (userMessage: string, agent?: AIAgent): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

  const responses = [
    "Thank you for your message! I'm here to help you with any questions you might have.",
    "I understand your concern. Let me gather some information to assist you better.",
    "That's a great question! Here's what I can tell you about that...",
    "I appreciate you reaching out. Let me connect you with the right resources.",
    "Thanks for contacting us! I'll make sure to address your inquiry promptly.",
    "I see what you're asking about. Let me provide you with a detailed explanation.",
    "Your request is important to us. I'll get back to you with a comprehensive answer.",
  ];

  if (agent) {
    return `[${agent.name}]: ${responses[Math.floor(Math.random() * responses.length)]}`;
  }

  return responses[Math.floor(Math.random() * responses.length)];
};

const MessageStatus = ({ message }: { message: Message }) => {
  if (message.from === 'customer') return null;

  return (
    <div className="flex items-center justify-end mt-1 gap-1">
      {message.read ? (
        <CheckCheck className="h-3 w-3 text-blue-500" />
      ) : (
        <Check className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  );
};

export default function ChatDisplay({
  conversation: initialConversation,
}: {
  conversation: Conversation;
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiAgents, setAIAgents] = useState<AIAgent[]>([]);
  const [assignedAgent, setAssignedAgent] = useState<AIAgent | null>(null);
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(true);
  const [customerIsTyping, setCustomerIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // WebSocket integration for real-time messaging
  const { isConnected, messages: realTimeMessages, sendMessage: sendWebSocketMessage } = useWebSocket(conversation.id);

  useEffect(() => {
    const loadAgents = async () => {
      const agents = await getAIAgents();
      setAIAgents(agents);

      // Find assigned agent for this conversation's channel
      const channelAgent = agents.find(agent =>
        agent.channelIds?.includes(conversation.channel.id)
      );
      setAssignedAgent(channelAgent || null);
    };

    loadAgents();
  }, [conversation.channel.id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Handle real-time messages from WebSocket
  useEffect(() => {
    if (realTimeMessages.length > 0) {
      const latestMessage = realTimeMessages[realTimeMessages.length - 1];

      if (latestMessage.type === 'new_message') {
        // Add new message to conversation
        setConversation(prev => ({
          ...prev,
          messages: [...prev.messages, latestMessage.data]
        }));
      } else if (latestMessage.type === 'message_update') {
        // Update existing message (e.g., read status)
        setConversation(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === latestMessage.data.id ? { ...msg, ...latestMessage.data } : msg
          )
        }));
      } else if (latestMessage.type === 'user_typing') {
        // Handle typing indicators
        setCustomerIsTyping(latestMessage.data.isTyping);
      }
    }
  }, [realTimeMessages]);

  // Handle typing indicators
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;

    if (newMessage.trim()) {
      // Send typing start event
      sendWebSocketMessage({
        type: 'typing_start',
        data: {
          conversationId: conversation.id,
          userId: 'agent'
        }
      });

      typingTimeout = setTimeout(() => {
        // Send typing stop event after delay
        sendWebSocketMessage({
          type: 'typing_stop',
          data: {
            conversationId: conversation.id,
            userId: 'agent'
          }
        });
      }, 2000);
    }

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        sendWebSocketMessage({
          type: 'typing_stop',
          data: {
            conversationId: conversation.id,
            userId: 'agent'
          }
        });
      }
    };
  }, [newMessage, conversation.id, sendWebSocketMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Send human agent reply through the conversation API
      const response = await fetch(`/api/inbox/conversations/${conversation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          agentId: 'human-agent' // Or get actual agent ID from context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();

      // Add message to local state immediately for better UX
      const newMessageObj: Message = {
        id: result.messageId || Date.now().toString(),
        text: messageText,
        timestamp: new Date().toISOString(),
        from: 'agent',
        read: false
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessageObj],
      }));

      toast({
        title: "Message Sent",
        description: "Your reply has been sent through the channel",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const toggleAutoReply = () => {
    setIsAutoReplyEnabled(!isAutoReplyEnabled);
    toast({
      title: isAutoReplyEnabled ? "Auto-reply disabled" : "Auto-reply enabled",
      description: isAutoReplyEnabled
        ? "AI will no longer auto-respond to messages"
        : "AI will automatically respond to new messages",
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={conversation.customer.avatar}
              alt={conversation.customer.name}
              className="h-12 w-12 rounded-full"
            />
            <div>
              <h2 className="text-lg font-semibold">
                {conversation.customer.name}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {conversation.channel.name}
                </p>
                {assignedAgent && (
                  <Badge variant="outline" className="gap-1">
                    <Bot className="h-3 w-3" />
                    {assignedAgent.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutoReply}
              className={cn(
                "gap-2",
                isAutoReplyEnabled ? "text-green-600" : "text-muted-foreground"
              )}
            >
              <Bot className="h-4 w-4" />
              Auto-reply {isAutoReplyEnabled ? "ON" : "OFF"}
            </Button>
            <Button variant="ghost" size="icon">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Archive Conversation</DropdownMenuItem>
                <DropdownMenuItem>Mark as Resolved</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex items-end gap-3',
              message.from === 'agent' ? 'flex-row-reverse' : ''
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              {message.from === 'agent' ? (
                <User className="h-4 w-4" />
              ) : (
                <img
                  src={conversation.customer.avatar}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full"
                />
              )}
            </div>
            <div className="flex flex-col max-w-xs lg:max-w-md">
              <div
                className={cn(
                  'rounded-2xl p-3',
                  message.from === 'agent'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm break-words">{message.text}</p>
              </div>
              <div className={cn(
                "flex items-center gap-2 mt-1",
                message.from === 'agent' ? 'justify-end' : 'justify-start'
              )}>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.timestamp)}
                </span>
                <MessageStatus message={message} />
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="border-t pt-6">
        <form onSubmit={handleSendMessage} className="relative w-full">
          <Input
            placeholder="Type a message..."
            className="pr-28"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isTyping}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={isTyping}
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              disabled={isTyping}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              type="submit"
              disabled={!newMessage.trim() || isTyping}
            >
              {isTyping ? <Clock className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
