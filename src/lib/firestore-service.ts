import { db } from './firebase/server';
import { Channel, Conversation, Message } from './types';

export interface FirestoreChannel {
  id: string;
  name: string;
  type: string;
  status: string;
  lastActivity: string;
  agentId?: string;
  autoReply: boolean;
  phoneNumber?: string;
  sessionId?: string;
  connectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreMessage {
  id: string;
  conversationId: string;
  channelId: string;
  from: 'customer' | 'agent' | 'bot';
  to: string;
  fromUser: string;
  text: string;
  timestamp: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  metadata?: any;
  read: boolean;
  createdAt: string;
}

export interface FirestoreConversation {
  id: string;
  channelId: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  status: 'active' | 'closed' | 'pending';
  assignedAgent?: string;
  tags: string[];
  summary?: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export class FirestoreService {
  private channelsCollection = 'channels';
  private conversationsCollection = 'conversations';
  private messagesCollection = 'messages';

  // Channel operations
  async saveChannel(channel: Channel & { sessionId?: string }): Promise<void> {
    try {
      const now = new Date().toISOString();
      const firestoreChannel: FirestoreChannel = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        status: channel.status,
        lastActivity: channel.lastActivity,
        agentId: channel.agentId,
        autoReply: channel.autoReply,
        phoneNumber: channel.phoneNumber,
        sessionId: channel.sessionId,
        connectedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(this.channelsCollection).doc(channel.id).set(firestoreChannel);
      console.log(`Channel ${channel.id} saved to Firestore`);
    } catch (error) {
      console.error('Error saving channel to Firestore:', error);
      throw error;
    }
  }

  async updateChannelStatus(channelId: string, updates: Partial<FirestoreChannel>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await db.collection(this.channelsCollection).doc(channelId).update(updateData);
      console.log(`Channel ${channelId} updated in Firestore`);
    } catch (error) {
      console.error('Error updating channel in Firestore:', error);
      throw error;
    }
  }

  async getChannel(channelId: string): Promise<FirestoreChannel | null> {
    try {
      const doc = await db.collection(this.channelsCollection).doc(channelId).get();
      if (doc.exists) {
        return doc.data() as FirestoreChannel;
      }
      return null;
    } catch (error) {
      console.error('Error getting channel from Firestore:', error);
      throw error;
    }
  }

  async getAllChannels(): Promise<FirestoreChannel[]> {
    try {
      const snapshot = await db.collection(this.channelsCollection).get();
      return snapshot.docs.map(doc => doc.data() as FirestoreChannel);
    } catch (error) {
      console.error('Error getting channels from Firestore:', error);
      throw error;
    }
  }

  // Conversation operations
  async saveConversation(conversation: FirestoreConversation): Promise<void> {
    try {
      await db.collection(this.conversationsCollection).doc(conversation.id).set(conversation);
      console.log(`Conversation ${conversation.id} saved to Firestore`);
    } catch (error) {
      console.error('Error saving conversation to Firestore:', error);
      throw error;
    }
  }

  async getConversationsByChannel(channelId: string, limit: number = 50): Promise<FirestoreConversation[]> {
    try {
      const snapshot = await db
        .collection(this.conversationsCollection)
        .where('channelId', '==', channelId)
        .orderBy('lastMessageAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as FirestoreConversation);
    } catch (error) {
      console.error('Error getting conversations from Firestore:', error);
      throw error;
    }
  }

  // Message operations
  async saveMessage(message: FirestoreMessage): Promise<void> {
    try {
      await db.collection(this.messagesCollection).doc(message.id).set(message);

      // Update conversation's lastMessageAt
      await this.updateConversationLastMessage(message.conversationId, message.timestamp);

      console.log(`Message ${message.id} saved to Firestore`);
    } catch (error) {
      console.error('Error saving message to Firestore:', error);
      throw error;
    }
  }

  async getMessagesByConversation(conversationId: string, limit: number = 100): Promise<FirestoreMessage[]> {
    try {
      const snapshot = await db
        .collection(this.messagesCollection)
        .where('conversationId', '==', conversationId)
        .orderBy('timestamp', 'asc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as FirestoreMessage);
    } catch (error) {
      console.error('Error getting messages from Firestore:', error);
      throw error;
    }
  }

  async getChatHistory(channelId: string, limit: number = 100): Promise<{
    conversations: FirestoreConversation[];
    messages: { [conversationId: string]: FirestoreMessage[] };
  }> {
    try {
      // Get recent conversations for this channel
      const conversations = await this.getConversationsByChannel(channelId, limit);

      // Get messages for each conversation
      const messages: { [conversationId: string]: FirestoreMessage[] } = {};

      for (const conversation of conversations) {
        const conversationMessages = await this.getMessagesByConversation(conversation.id, 50);
        messages[conversation.id] = conversationMessages;
      }

      console.log(`Retrieved chat history for channel ${channelId}: ${conversations.length} conversations`);

      return { conversations, messages };
    } catch (error) {
      console.error('Error getting chat history from Firestore:', error);
      throw error;
    }
  }

  private async updateConversationLastMessage(conversationId: string, timestamp: string): Promise<void> {
    try {
      await db.collection(this.conversationsCollection).doc(conversationId).update({
        lastMessageAt: timestamp,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating conversation last message:', error);
    }
  }

  // Utility methods
  async createConversationFromMessage(
    channelId: string,
    customerPhone: string,
    customerName: string,
    firstMessage: FirestoreMessage
  ): Promise<FirestoreConversation> {
    const now = new Date().toISOString();
    const conversation: FirestoreConversation = {
      id: `conv_${channelId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      channelId,
      customerPhone,
      customerName,
      status: 'active',
      tags: [],
      lastMessageAt: firstMessage.timestamp,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveConversation(conversation);
    return conversation;
  }

  // Search and query methods
  async searchConversations(query: string, channelId?: string): Promise<FirestoreConversation[]> {
    try {
      let firestoreQuery = db.collection(this.conversationsCollection);

      // Note: Firestore doesn't support full-text search, you might want to use Algolia or similar
      // For now, we'll do a simple search on customerName
      let queryRef = firestoreQuery
        .where('customerName', '>=', query)
        .where('customerName', '<=', query + '\uf8ff');

      if (channelId) {
        queryRef = queryRef.where('channelId', '==', channelId);
      }

      const snapshot = await queryRef
        .limit(20)
        .get();

      return snapshot.docs.map(doc => doc.data() as FirestoreConversation);
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }

  // AI Agent related methods
  async saveAIAgent(agent: {
    id: string;
    name: string;
    description: string;
    provider: string;
    prompt: string;
    model: string;
    channelIds: string[];
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    try {
      await db.collection('aiAgents').doc(agent.id).set(agent);
    } catch (error) {
      console.error('Error saving AI agent:', error);
      throw error;
    }
  }

  async getAIAgents(): Promise<any[]> {
    try {
      const snapshot = await db.collection('aiAgents').get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting AI agents:', error);
      throw error;
    }
  }

  async deleteAIAgent(agentId: string): Promise<void> {
    try {
      await db.collection('aiAgents').doc(agentId).delete();
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      throw error;
    }
  }

  async deleteChannel(channelId: string): Promise<void> {
    try {
      await db.collection('channels').doc(channelId).delete();
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  }

  // Marketing operations
  async saveMarketingConnection(connection: {
    id: string;
    platform: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    credentials: {
      accessToken?: string;
      refreshToken?: string;
      apiKey?: string;
      accountId?: string;
      businessId?: string;
    };
    lastSync?: string;
    syncStatus?: 'syncing' | 'success' | 'failed';
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    try {
      await db.collection('marketingConnections').doc(connection.id).set(connection);
      console.log(`Marketing connection ${connection.id} saved to Firestore`);
    } catch (error) {
      console.error('Error saving marketing connection to Firestore:', error);
      throw error;
    }
  }

  async saveMarketingCampaign(campaign: {
    id: string;
    name: string;
    platform: string;
    status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
    budget?: number;
    targetAudience?: string;
    schedule?: {
      startDate: string;
      endDate?: string;
      timezone: string;
    };
    metrics?: {
      impressions?: number;
      clicks?: number;
      conversions?: number;
      spend?: number;
      ctr?: number;
      cpc?: number;
    };
    createdAt: string;
    updatedAt: string;
  }): Promise<void> {
    try {
      await db.collection('marketingCampaigns').doc(campaign.id).set(campaign);
      console.log(`Marketing campaign ${campaign.id} saved to Firestore`);
    } catch (error) {
      console.error('Error saving marketing campaign to Firestore:', error);
      throw error;
    }
  }

  async getMarketingConnections(): Promise<any[]> {
    try {
      const snapshot = await db.collection('marketingConnections').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting marketing connections:', error);
      return [];
    }
  }

  async getMarketingCampaigns(): Promise<any[]> {
    try {
      const snapshot = await db.collection('marketingCampaigns').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting marketing campaigns:', error);
      return [];
    }
  }

  async updateMarketingCampaign(campaignId: string, updates: any): Promise<void> {
    try {
      await db.collection('marketingCampaigns').doc(campaignId).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating marketing campaign:', error);
      throw error;
    }
  }

  async saveCampaignPerformance(performance: {
    campaignId: string;
    platform: string;
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
  }): Promise<void> {
    try {
      const id = `${performance.campaignId}_${performance.date}`;
      await db.collection('campaignPerformance').doc(id).set(performance);
    } catch (error) {
      console.error('Error saving campaign performance:', error);
      throw error;
    }
  }

  async getCampaignPerformance(campaignId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const snapshot = await db.collection('campaignPerformance')
        .where('campaignId', '==', campaignId)
        .where('date', '>=', startDateStr)
        .orderBy('date', 'asc')
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting campaign performance:', error);
      return [];
    }
  }

  // Get a specific conversation
  async getConversation(conversationId: string): Promise<any> {
    try {
      const doc = await db.collection(this.conversationsCollection).doc(conversationId).get();

      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  // Update a conversation
  async updateConversation(conversationId: string, updates: any): Promise<boolean> {
    try {
      await db.collection(this.conversationsCollection).doc(conversationId).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error updating conversation:', error);
      return false;
    }
  }

  // Get conversations for inbox
  async getConversations(limit = 50): Promise<any[]> {
    try {
      const snapshot = await db.collection(this.conversationsCollection)
        .orderBy('lastMessageAt', 'desc')
        .limit(limit)
        .get();

      const conversations: any[] = [];

      snapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return conversations;
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  // Get messages by date range
  async getMessagesByDateRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const snapshot = await db.collection(this.messagesCollection)
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc')
        .get();

      const messages: any[] = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting messages by date range:', error);
      return [];
    }
  }

  // Get messages by channel
  async getMessagesByChannel(channelId: string, limit = 100): Promise<any[]> {
    try {
      const snapshot = await db.collection(this.messagesCollection)
        .where('channelId', '==', channelId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const messages: any[] = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting messages by channel:', error);
      return [];
    }
  }

  // Get all messages
  async getAllMessages(limit = 1000): Promise<any[]> {
    try {
      const snapshot = await db.collection(this.messagesCollection)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const messages: any[] = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return messages;
    } catch (error) {
      console.error('Error getting all messages:', error);
      return [];
    }
  }
}

export const firestoreService = new FirestoreService();
