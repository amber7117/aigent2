// AI Agent Manager for automated message responses

import { getDatabase, AIAgentPrompt, ConversationMessage } from './database';

export interface AIAgent {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    prompts: AIAgentPrompt[];
    settings: {
        responseDelay: number; // Seconds to wait before responding
        maxResponsesPerMinute: number;
        workingHours?: {
            enabled: boolean;
            timezone: string;
            schedule: Array<{
                day: string;
                start: string;
                end: string;
            }>;
        };
    };
}

class AIAgentManager {
    private agents = new Map<string, AIAgent>();

    constructor() {
        // Initialize with default agents and prompts
        this.initializeDefaultAgents();
    }

    // Initialize default AI agents with common prompts
    private async initializeDefaultAgents() {
        const defaultAgents: AIAgent[] = [
            {
                id: 'customer-support',
                name: 'Customer Support Agent',
                description: 'Handles general customer inquiries and support requests',
                isActive: true,
                prompts: [],
                settings: {
                    responseDelay: 2,
                    maxResponsesPerMinute: 10,
                    workingHours: {
                        enabled: true,
                        timezone: 'UTC',
                        schedule: [
                            { day: 'monday', start: '09:00', end: '18:00' },
                            { day: 'tuesday', start: '09:00', end: '18:00' },
                            { day: 'wednesday', start: '09:00', end: '18:00' },
                            { day: 'thursday', start: '09:00', end: '18:00' },
                            { day: 'friday', start: '09:00', end: '18:00' },
                        ]
                    }
                }
            },
            {
                id: 'sales-assistant',
                name: 'Sales Assistant',
                description: 'Helps with product inquiries and sales processes',
                isActive: true,
                prompts: [],
                settings: {
                    responseDelay: 1,
                    maxResponsesPerMinute: 15,
                }
            },
            {
                id: 'tech-support',
                name: 'Technical Support',
                description: 'Provides technical assistance and troubleshooting',
                isActive: true,
                prompts: [],
                settings: {
                    responseDelay: 3,
                    maxResponsesPerMinute: 8,
                }
            }
        ];

        // Add default prompts
        const defaultPrompts: AIAgentPrompt[] = [
            // Customer Support Prompts
            {
                id: 'greeting',
                agentId: 'customer-support',
                name: 'Greeting Response',
                prompt: 'Hello {userName}! Welcome to our service. How can I help you today?',
                triggerWords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
                priority: 10,
                isActive: true,
                conditions: {},
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'help-request',
                agentId: 'customer-support',
                name: 'Help Request',
                prompt: 'I\'m here to help you, {userName}! Can you please describe what you need assistance with? Our support team will make sure to address your concerns.',
                triggerWords: ['help', 'support', 'assistance', 'problem', 'issue'],
                priority: 9,
                isActive: true,
                conditions: {},
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'thank-you',
                agentId: 'customer-support',
                name: 'Thank You Response',
                prompt: 'You\'re very welcome, {userName}! Is there anything else I can help you with today?',
                triggerWords: ['thank', 'thanks', 'appreciate'],
                priority: 8,
                isActive: true,
                conditions: {},
                createdAt: new Date(),
                updatedAt: new Date()
            },
            // Sales Assistant Prompts
            {
                id: 'pricing-inquiry',
                agentId: 'sales-assistant',
                name: 'Pricing Information',
                prompt: 'Hi {userName}! I\'d be happy to help you with pricing information. Let me get you the most current pricing for our products and services. What specific product or service are you interested in?',
                triggerWords: ['price', 'cost', 'pricing', 'how much', 'quote'],
                priority: 10,
                isActive: true,
                conditions: {},
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'product-inquiry',
                agentId: 'sales-assistant',
                name: 'Product Information',
                prompt: 'Great question about our products, {userName}! I\'d love to help you find the perfect solution for your needs. Can you tell me more about what you\'re looking for?',
                triggerWords: ['product', 'service', 'feature', 'what do you offer'],
                priority: 9,
                isActive: true,
                conditions: {},
                createdAt: new Date(),
                updatedAt: new Date()
            },
            // Tech Support Prompts
            {
                id: 'technical-issue',
                agentId: 'tech-support',
                name: 'Technical Issue Response',
                prompt: 'Hi {userName}, I understand you\'re experiencing a technical issue. Let me help you troubleshoot this. Can you provide more details about the problem you\'re encountering?',
                triggerWords: ['bug', 'error', 'not working', 'broken', 'technical', 'troubleshoot'],
                priority: 10,
                isActive: true,
                conditions: {},
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        // Store agents and prompts
        for (const agent of defaultAgents) {
            this.agents.set(agent.id, agent);
        }

        // Store prompts in database
        const database = getDatabase();
        for (const prompt of defaultPrompts) {
            // Assuming we have a method to save prompts
            console.log(`Default prompt initialized: ${prompt.name} for agent ${prompt.agentId}`);
        }
    }

    // Get agent by ID
    getAgent(agentId: string): AIAgent | null {
        return this.agents.get(agentId) || null;
    }

    // Get all agents
    getAllAgents(): AIAgent[] {
        return Array.from(this.agents.values());
    }

    // Generate AI response for a message
    async generateResponse(agentId: string, message: ConversationMessage): Promise<string | null> {
        const agent = this.getAgent(agentId);
        if (!agent || !agent.isActive) {
            return null;
        }

        // Check if within working hours
        if (!this.isWithinWorkingHours(agent)) {
            return this.getOutOfHoursMessage();
        }

        try {
            const database = getDatabase();
            const prompts = await database.getAgentPrompts(agentId);

            if (prompts.length === 0) {
                return this.getDefaultResponse(message.fromUserName || 'there');
            }

            // Find matching prompt
            const matchingPrompt = this.findMatchingPrompt(prompts, message);
            if (!matchingPrompt) {
                return this.getDefaultResponse(message.fromUserName || 'there');
            }

            // Generate response from prompt
            return this.processPromptTemplate(matchingPrompt.prompt, message);

        } catch (error) {
            console.error('Failed to generate AI response:', error);
            return null;
        }
    }

    // Check if current time is within agent's working hours
    private isWithinWorkingHours(agent: AIAgent): boolean {
        if (!agent.settings.workingHours?.enabled) {
            return true; // Always available if working hours not enabled
        }

        const now = new Date();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDay = dayNames[now.getDay()]; // Get day name
        const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

        const todaySchedule = agent.settings.workingHours.schedule.find(
            schedule => schedule.day.toLowerCase().startsWith(currentDay)
        );

        if (!todaySchedule) {
            return false; // No schedule for today
        }

        const startTime = this.timeToNumber(todaySchedule.start);
        const endTime = this.timeToNumber(todaySchedule.end);

        return currentTime >= startTime && currentTime <= endTime;
    }

    // Convert time string "09:30" to number 930
    private timeToNumber(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 100 + minutes;
    }

    // Get out of hours message
    private getOutOfHoursMessage(): string {
        return "Thank you for your message! Our team is currently offline, but we'll get back to you during our business hours. Your message is important to us!";
    }

    // Get default response when no specific prompt matches
    private getDefaultResponse(userName: string): string {
        const responses = [
            `Thank you for your message, ${userName}! Our team has received it and will get back to you shortly.`,
            `Hi ${userName}! I've noted your inquiry and someone from our team will respond to you soon.`,
            `Thanks for reaching out, ${userName}! We're reviewing your message and will provide a response as quickly as possible.`,
            `Hello ${userName}! Your message is important to us. Our team will review it and get back to you shortly.`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Find matching prompt based on trigger words and conditions
    private findMatchingPrompt(prompts: AIAgentPrompt[], message: ConversationMessage): AIAgentPrompt | null {
        const activePrompts = prompts.filter(p => p.isActive);

        // Sort by priority (higher first)
        const sortedPrompts = activePrompts.sort((a, b) => b.priority - a.priority);

        for (const prompt of sortedPrompts) {
            if (this.promptMatches(prompt, message)) {
                return prompt;
            }
        }

        return null;
    }

    // Check if a prompt matches the message
    private promptMatches(prompt: AIAgentPrompt, message: ConversationMessage): boolean {
        // Check trigger words
        if (prompt.triggerWords && prompt.triggerWords.length > 0) {
            const messageText = message.messageText.toLowerCase();
            const hasMatchingWord = prompt.triggerWords.some(word =>
                messageText.includes(word.toLowerCase())
            );

            if (!hasMatchingWord) {
                return false;
            }
        }

        // Check conditions (if any)
        if (prompt.conditions.messageType && prompt.conditions.messageType.length > 0) {
            if (!prompt.conditions.messageType.includes(message.messageType)) {
                return false;
            }
        }

        // Check time conditions
        if (prompt.conditions.timeOfDay) {
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            const startTime = this.timeToNumber(prompt.conditions.timeOfDay.start);
            const endTime = this.timeToNumber(prompt.conditions.timeOfDay.end);

            if (currentTime < startTime || currentTime > endTime) {
                return false;
            }
        }

        return true;
    }

    // Process prompt template with variables
    private processPromptTemplate(template: string, message: ConversationMessage): string {
        return template
            .replace(/\{userName\}/g, message.fromUserName || 'there')
            .replace(/\{userMessage\}/g, message.messageText)
            .replace(/\{platform\}/g, message.metadata.platform)
            .replace(/\{time\}/g, new Date().toLocaleTimeString());
    }

    // Add a new agent
    addAgent(agent: AIAgent): void {
        this.agents.set(agent.id, agent);
        console.log(`AI Agent added: ${agent.name}`);
    }

    // Update agent
    updateAgent(agentId: string, updates: Partial<AIAgent>): boolean {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }

        const updatedAgent = { ...agent, ...updates };
        this.agents.set(agentId, updatedAgent);
        console.log(`AI Agent updated: ${agentId}`);
        return true;
    }

    // Delete agent
    deleteAgent(agentId: string): boolean {
        const deleted = this.agents.delete(agentId);
        if (deleted) {
            console.log(`AI Agent deleted: ${agentId}`);
        }
        return deleted;
    }
}

// Singleton instance
let aiAgentManager: AIAgentManager;

export function getAIAgentManager(): AIAgentManager {
    if (!aiAgentManager) {
        aiAgentManager = new AIAgentManager();
    }
    return aiAgentManager;
}