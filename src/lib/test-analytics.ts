import { FirestoreService } from './firestore-service';
import { randomUUID } from 'crypto';

const firestoreService = new FirestoreService();

export async function createTestData() {
    console.log('Creating test data for analytics...');

    try {
        const now = new Date();
        const channelId = 'test-whatsapp-channel';

        // Create test channel
        await firestoreService.saveChannel({
            id: channelId,
            name: 'Test WhatsApp Channel',
            type: 'WhatsApp',
            status: 'online',
            lastActivity: now.toISOString(),
            autoReply: false,
            description: 'Test channel for analytics'
        });

        // Create test conversations and messages
        for (let i = 0; i < 5; i++) {
            const conversationId = `test-conversation-${i}`;

            // Create conversation
            await firestoreService.saveConversation({
                id: conversationId,
                channelId: channelId,
                customerName: `Test Customer ${i + 1}`,
                customerPhone: `+1555000000${i}`,
                customerAvatar: '',
                status: 'active',
                tags: ['test'],
                createdAt: now.toISOString(),
                lastMessageAt: now.toISOString(),
                updatedAt: now.toISOString()
            });

            // Create multiple messages for each conversation
            for (let j = 0; j < 10; j++) {
                const messageTime = new Date(now.getTime() - (i * 1000 * 60 * 60) - (j * 1000 * 60 * 10)); // Spread over time

                // Customer message
                await firestoreService.saveMessage({
                    id: randomUUID(),
                    conversationId: conversationId,
                    channelId: channelId,
                    from: 'customer',
                    to: channelId,
                    fromUser: `Test Customer ${i + 1}`,
                    text: `Hello, this is test message ${j + 1} from customer ${i + 1}`,
                    timestamp: messageTime.toISOString(),
                    messageType: 'text',
                    read: true,
                    createdAt: messageTime.toISOString()
                });

                // Agent response (with some delay)
                const responseTime = new Date(messageTime.getTime() + (1000 * 60 * Math.random() * 5)); // 0-5 min response
                await firestoreService.saveMessage({
                    id: randomUUID(),
                    conversationId: conversationId,
                    channelId: channelId,
                    from: 'agent',
                    to: conversationId,
                    fromUser: 'Test Agent',
                    text: `Thank you for your message. This is response ${j + 1}.`,
                    timestamp: responseTime.toISOString(),
                    messageType: 'text',
                    read: true,
                    createdAt: responseTime.toISOString()
                });
            }
        }

        console.log('Test data created successfully!');
        return { success: true, channelId };
    } catch (error) {
        console.error('Error creating test data:', error);
        return { success: false, error };
    }
}

export async function clearTestData() {
    console.log('Clearing test data...');

    try {
        // Note: In a real application, you would implement batch delete operations
        // For now, this is just a placeholder
        console.log('Test data clearing would be implemented here');
        return { success: true };
    } catch (error) {
        console.error('Error clearing test data:', error);
        return { success: false, error };
    }
}