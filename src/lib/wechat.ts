import { WechatyBuilder, Contact, Room } from 'wechaty';
import { FirestoreService } from './firestore-service';
import { randomUUID } from 'crypto';
import { getAIAgentManager } from './ai-agent-manager';

const firestoreService = new FirestoreService();

class WeChatManager {
  private wechaty = WechatyBuilder.build({
    name: 'wechat-assistant',
    puppet: 'wechaty-puppet-wechat',
  });

  private agentBindings: Map<string, string> = new Map(); // channelId -> agentId
  private autoReplyEnabled: Map<string, boolean> = new Map(); // channelId -> enabled

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.wechaty
      .on('scan', (qrcode, status) => {
        console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`);
      })
      .on('login', user => {
        console.log(`User ${user} logged in`);
      })
      .on('message', async (message) => {
        await this.handleMessage(message);
      });
  }

  async start() {
    try {
      await this.wechaty.start();
      console.log('WeChat client started');
    } catch (error) {
      console.error('Failed to start WeChat client:', error);
    }
  }

  async stop() {
    try {
      await this.wechaty.stop();
      console.log('WeChat client stopped');
    } catch (error) {
      console.error('Failed to stop WeChat client:', error);
    }
  }

  // 智能体绑定方法
  bindAgent(channelId: string, agentId: string): void {
    this.agentBindings.set(channelId, agentId);
    console.log(`Agent ${agentId} bound to WeChat channel ${channelId}`);
  }

  unbindAgent(channelId: string): void {
    this.agentBindings.delete(channelId);
    console.log(`Agent unbound from WeChat channel ${channelId}`);
  }

  getBoundAgent(channelId: string): string | null {
    return this.agentBindings.get(channelId) || null;
  }

  // 自动回复开关方法
  setAutoReply(channelId: string, enabled: boolean): void {
    this.autoReplyEnabled.set(channelId, enabled);
    console.log(`Auto-reply for channel ${channelId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  getAutoReplyStatus(channelId: string): boolean {
    return this.autoReplyEnabled.get(channelId) || false;
  }

  private async handleMessage(message: any) {
    console.log(`Message: ${message}`);

    try {
      // Skip messages sent by the bot
      if (message.self()) return;

      const contact = message.from();
      const room = message.room();
      const timestamp = new Date().toISOString();
      const messageId = randomUUID();

      let channelId = 'wechat-default';
      let conversationId = '';

      if (room) {
        // Group message
        channelId = `wechat-room-${room.id}`;
        conversationId = `wechat-room-${room.id}`;
      } else if (contact) {
        // Direct message
        conversationId = `wechat-${contact.id}`;
      }

      // Find or create channel
      try {
        const channels = await firestoreService.getAllChannels();
        const existingChannel = channels.find(c => c.id === channelId);

        if (!existingChannel) {
          await firestoreService.saveChannel({
            id: channelId,
            name: room ? `WeChat Room - ${room.topic() || room.id}` : 'WeChat - Direct Messages',
            type: 'WeChat',
            status: 'online',
            lastActivity: timestamp,
            autoReply: false,
            description: room ? 'WeChat group channel' : 'WeChat direct messaging channel'
          });
        }
      } catch (error) {
        console.error('Error managing WeChat channel:', error);
      }

      // Find or create conversation
      if (conversationId && contact) {
        try {
          const conversations = await firestoreService.getConversations();
          const existingConversation = conversations.find((c: any) => c.id === conversationId);

          if (!existingConversation) {
            await firestoreService.saveConversation({
              id: conversationId,
              channelId: channelId,
              customerName: contact.name() || contact.id,
              customerPhone: '',
              customerAvatar: '',
              status: 'active',
              tags: [],
              createdAt: timestamp,
              lastMessageAt: timestamp,
              updatedAt: timestamp
            });
          }
        } catch (error) {
          console.error('Error managing WeChat conversation:', error);
        }
      }

      // Save message
      if (conversationId) {
        try {
          await firestoreService.saveMessage({
            id: messageId,
            conversationId: conversationId,
            channelId: channelId,
            from: 'customer',
            to: channelId,
            fromUser: contact?.name() || 'Unknown',
            text: message.text() || '[Media Message]',
            timestamp: timestamp,
            messageType: 'text',
            read: false,
            createdAt: timestamp
          });

          console.log(`WeChat message saved: ${messageId}`);

          // Trigger AI auto-reply if enabled
          await this.handleAutoReply(channelId, conversationId, contact, room, message.text(), timestamp);

        } catch (error) {
          console.error('Error saving WeChat message:', error);
        }
      }
    } catch (error) {
      console.error('Error processing WeChat message:', error);
    }
  }

  private async handleAutoReply(
    channelId: string,
    conversationId: string,
    contact: Contact,
    room: Room | null,
    messageText: string,
    timestamp: string
  ) {
    try {
      // Check if auto-reply is enabled
      if (!this.getAutoReplyStatus(channelId)) {
        return;
      }

      const boundAgentId = this.getBoundAgent(channelId);
      if (!boundAgentId) {
        console.log(`No agent bound to channel ${channelId}`);
        return;
      }

      // Generate AI response
      const aiResponse = await this.generateAIResponse(messageText, channelId, contact.name() || 'WeChat User');
      if (!aiResponse) {
        console.log('No AI response generated');
        return;
      }

      // Send response
      if (room) {
        // Reply in group
        await room.say(aiResponse);
      } else if (contact) {
        // Reply in direct message
        await contact.say(aiResponse);
      }

      // Save AI response message
      const aiMessageId = randomUUID();
      await firestoreService.saveMessage({
        id: aiMessageId,
        conversationId: conversationId,
        channelId: channelId,
        from: 'bot',
        to: room ? room.id : contact.id,
        fromUser: 'AI Agent',
        text: aiResponse,
        timestamp: timestamp,
        messageType: 'text',
        read: true,
        createdAt: timestamp
      });

      console.log(`AI response sent and saved: ${aiMessageId}`);

    } catch (error) {
      console.error('Error in WeChat auto-reply:', error);
    }
  }

  // AI回复生成方法 - 使用智能体的prompt和角色
  private async generateAIResponse(message: string, channelId: string, fromUserName: string = 'WeChat User'): Promise<string | null> {
    try {
      const boundAgentId = this.getBoundAgent(channelId);

      if (boundAgentId) {
        // 使用绑定的智能体生成回复
        const aiAgentManager = getAIAgentManager();

        // 创建完整的消息对象
        const conversationMessage = {
          id: `wechat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          channelId: channelId,
          conversationId: `wechat_${channelId}_${fromUserName}`,
          fromUser: fromUserName,
          fromUserName: fromUserName,
          toUser: channelId,
          messageText: message,
          messageType: 'text' as const,
          timestamp: new Date(),
          isFromBot: false,
          isRead: false,
          deliveryStatus: 'delivered' as const,
          metadata: {
            platform: 'wechat'
          }
        };

        const response = await aiAgentManager.generateResponse(boundAgentId, conversationMessage);
        if (response) {
          return response;
        }
      }

      // 如果没有绑定智能体或智能体没有回复，使用默认回复
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return "Hello! I'm an AI assistant. How can I help you today?";
      }
      if (lowerMessage.includes('help')) {
        return "I'm here to help! What do you need assistance with?";
      }
      if (lowerMessage.includes('thank')) {
        return "You're welcome! Is there anything else I can help you with?";
      }

      // 默认回复
      return "Thank you for your message. I'm an AI assistant and will get back to you shortly.";

    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  }
}

// Singleton instance
let wechatManager: WeChatManager;

export function getWeChatManager(): WeChatManager {
  if (!wechatManager) {
    wechatManager = new WeChatManager();
    wechatManager.start();
  }
  return wechatManager;
}

export default getWeChatManager;
