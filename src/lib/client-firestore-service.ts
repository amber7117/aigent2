// Client-side Firestore service wrapper
export class ClientFirestoreService {
    private async makeRequest(action: string, data: any = {}) {
        const response = await fetch('/api/firestore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data }),
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Firestore operation failed');
        }

        return result.data;
    }

    async saveChannel(channel: any): Promise<void> {
        await this.makeRequest('saveChannel', channel);
    }

    async updateChannelStatus(channelId: string, updates: any): Promise<void> {
        await this.makeRequest('updateChannel', { channelId, ...updates });
    }

    async getChannel(channelId: string): Promise<any> {
        return await this.makeRequest('getChannel', { channelId });
    }

    async getAllChannels(): Promise<any[]> {
        return await this.makeRequest('getAllChannels');
    }
}

export const clientFirestoreService = new ClientFirestoreService();