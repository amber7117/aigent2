import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { message, sessionId, projectId, timestamp } = await request.json();

        // Log the incoming message for debugging
        console.log('Widget message received:', { message, sessionId, projectId, timestamp });

        // Simulate AI response - in a real implementation, this would integrate with your AI service
        const responses = [
            "Thanks for reaching out! How can I assist you today?",
            "I'd be happy to help you with that. Let me connect you with our team.",
            "That's a great question! Let me find the information you need.",
            "I understand your concern. Let me help you resolve this.",
            "Thank you for contacting us. We'll get back to you shortly with the information.",
            "I can definitely help with that. What specific details would you like to know?",
        ];

        // Simple keyword-based responses
        const lowerMessage = message.toLowerCase();
        let reply = '';

        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
            reply = "Our pricing starts at $29/month for the basic plan. Would you like me to send you our detailed pricing information?";
        } else if (lowerMessage.includes('demo') || lowerMessage.includes('trial')) {
            reply = "Great! We offer a 14-day free trial. I can set that up for you right away. What's your email address?";
        } else if (lowerMessage.includes('support') || lowerMessage.includes('help')) {
            reply = "I'm here to help! Our support team is available 24/7. What specific issue are you experiencing?";
        } else if (lowerMessage.includes('feature') || lowerMessage.includes('functionality')) {
            reply = "OmniChat offers multi-channel messaging, AI automation, analytics, and more. Which features are you most interested in?";
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            reply = "Hello! Welcome to OmniChat. I'm here to help you with any questions about our unified chat platform. How can I assist you?";
        } else {
            // Random response for other messages
            reply = responses[Math.floor(Math.random() * responses.length)];
        }

        // Simulate some processing delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

        return NextResponse.json({
            success: true,
            reply,
            sessionId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Widget API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to process message'
        }, { status: 500 });
    }
}