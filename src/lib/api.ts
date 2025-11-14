
import { users, aiAgents, channels, files, aiSettings, analyticsStats, conversationVolumeData, responseTimeData, satisfactionData } from './data';
import conversationsData from './conversations.json';
import type { User, AIAgent, Channel, Conversation, FileItem, AISettings, Message, ChannelType } from './types';

// Simulate a network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate unique ID with timestamp, counter and random component
let idCounter = Math.floor(Math.random() * 10000); // Start with random counter to avoid conflicts
const generateUniqueId = (prefix: string) => {
    idCounter++; // Increment counter for each ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const processId = typeof process !== 'undefined' ? (process.pid || 0) : Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${idCounter}-${random}-${processId}`;
};

const conversations: Conversation[] = conversationsData as Conversation[];

// API functions
export async function getLoggedInUser(): Promise<User> {
    await delay(100);

    // Check if user is stored in localStorage (for demo purposes)
    if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('user');
            }
        }
    }

    // Fallback to default user
    return users[0];
}
export async function getUsers(): Promise<User[]> {
    await delay(500);
    return users;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
    await delay(500);
    const user = users.find(u => u.id === userId);
    if (!user) {
        throw new Error('User not found');
    }
    Object.assign(user, updates);
    console.log(`Updated user ${userId}:`, user);
    return user;
}

export async function getAIAgents(): Promise<AIAgent[]> {
    await delay(500);
    return aiAgents;
}

export async function getChannels(): Promise<Channel[]> {
    await delay(500);
    return channels;
}

export async function addChannel({ name, type }: { name: string, type: ChannelType }): Promise<Channel> {
    await delay(500);
    const newChannel: Channel = {
        id: generateUniqueId('ch'),
        name,
        type,
        status: 'offline',
        lastActivity: 'Never',
        autoReply: true,
    };
    channels.push(newChannel);

    // Save to Firestore via API route
    try {
        await fetch('/api/firestore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'saveChannel',
                id: newChannel.id,
                name: newChannel.name,
                type: newChannel.type,
                status: newChannel.status,
                lastActivity: newChannel.lastActivity,
                agentId: newChannel.agentId,
                autoReply: newChannel.autoReply,
                phoneNumber: newChannel.phoneNumber,
                connectedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        });
        console.log(`New channel saved to Firestore: ${newChannel.id}`);
    } catch (firestoreError) {
        console.error('Failed to save new channel to Firestore:', firestoreError);
        // Don't break functionality, continue execution
    }

    return newChannel;
}

export async function getConversations(): Promise<Conversation[]> {
    await delay(500);
    return conversations;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
    await delay(500);
    return conversations.find(conv => conv.id === id);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
    await delay(200);
    const conversation = conversations.find(conv => conv.id === conversationId);
    return conversation ? conversation.messages : [];
}

export async function sendMessage(conversationId: string, text: string): Promise<Message> {
    await delay(300);
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
        throw new Error('Conversation not found');
    }
    const newMessage: Message = {
        id: generateUniqueId('msg'),
        from: 'agent',
        text,
        timestamp: new Date().toISOString(),
        read: true,
    };
    conversation.messages.push(newMessage);
    return newMessage;
}

export async function getFiles(): Promise<FileItem[]> {
    await delay(500);
    return files;
}

export async function getAISettings(): Promise<AISettings> {
    await delay(500);
    return aiSettings;
}

export async function saveAISettings(settings: AISettings): Promise<void> {
    await delay(500);
    Object.assign(aiSettings, settings);
    console.log('Saved AI settings:', aiSettings);
}

export async function updateChannel(channelId: string, updates: Partial<Channel>): Promise<Channel> {
    await delay(500);
    const channel = channels.find(ch => ch.id === channelId);
    if (!channel) {
        throw new Error('Channel not found');
    }
    Object.assign(channel, updates);
    console.log(`Updated channel ${channelId}:`, channel);

    // Save to Firestore via API route
    try {
        await fetch('/api/firestore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'saveChannel',
                id: channel.id,
                name: channel.name,
                type: channel.type,
                status: channel.status,
                lastActivity: channel.lastActivity,
                agentId: channel.agentId,
                autoReply: channel.autoReply,
                phoneNumber: channel.phoneNumber,
                connectedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        });
        console.log(`Updated channel saved to Firestore: ${channelId}`);
    } catch (firestoreError) {
        console.error('Failed to save updated channel to Firestore:', firestoreError);
        // Don't break functionality, continue execution
    }

    return channel;
}

// Analytics API
export async function getAnalyticsStats() {
    await delay(700);
    return analyticsStats;
}

export async function getConversationVolume() {
    await delay(700);
    return conversationVolumeData;
}

export async function getResponseTime() {
    await delay(700);
    return responseTimeData;
}

export async function getSatisfactionRatings() {
    await delay(700);
    return satisfactionData;
}


export async function createAgent(agent: Omit<AIAgent, 'id'>): Promise<AIAgent> {
    await delay(500);
    const newAgent: AIAgent = {
        id: generateUniqueId('agent'),
        ...agent,
        channelIds: [],
    };
    aiAgents.push(newAgent);

    // Save to Firestore via API route
    try {
        await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                ...newAgent,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        });
        console.log(`AI Agent saved to Firestore: ${newAgent.id}`);
    } catch (firestoreError) {
        console.error('Failed to save AI Agent to Firestore:', firestoreError);
        // Don't break functionality, continue execution
    }

    return newAgent;
}

export async function deleteAgent(agentId: string): Promise<{ success: boolean }> {
    await delay(500);
    const index = aiAgents.findIndex(a => a.id === agentId);
    if (index > -1) {
        aiAgents.splice(index, 1);
        channels.forEach(c => {
            if (c.agentId === agentId) {
                c.agentId = undefined;
            }
        });

        // Delete from Firestore via API route
        try {
            await fetch('/api/agents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId })
            });
            console.log(`AI Agent deleted from Firestore: ${agentId}`);
        } catch (firestoreError) {
            console.error('Failed to delete AI Agent from Firestore:', firestoreError);
            // Don't break functionality, continue execution
        }

        return { success: true };
    }
    return { success: false };
}

export async function deleteFile(fileId: string): Promise<{ success: boolean }> {
    await delay(300);
    const index = files.findIndex((f) => f.id === fileId);
    if (index > -1) {
        files.splice(index, 1);
        return { success: true };
    }
    return { success: false };
}

export async function deleteChannel(channelId: string): Promise<{ success: boolean }> {
    await delay(300);
    const index = channels.findIndex((c) => c.id === channelId);
    if (index > -1) {
        channels.splice(index, 1);
        // Also remove channel associations from AI agents
        aiAgents.forEach(agent => {
            if (agent.channelIds?.includes(channelId)) {
                agent.channelIds = agent.channelIds.filter(id => id !== channelId);
            }
        });

        // Delete from Firestore via API route
        try {
            await fetch('/api/channels', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId })
            });
            console.log(`Channel deleted from Firestore: ${channelId}`);
        } catch (firestoreError) {
            console.error('Failed to delete channel from Firestore:', firestoreError);
            // Don't break functionality, continue execution
        }

        return { success: true };
    }
    return { success: false };
}
