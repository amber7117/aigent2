import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { getAISettings } from '@/lib/api';
import { getDatabase, generateMessageId } from '@/lib/database';
import { firestoreService } from '@/lib/firestore-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            message,
            agentId,
            channelId,
            sessionId,
            fromUser,
            toUser
        } = body;

        if (!message || !agentId) {
            return NextResponse.json({
                success: false,
                error: 'Missing required parameters'
            }, { status: 400 });
        }

        // 获取智能体信息
        const db = getDatabase();
        const agents = await db.getAllAIAgents();
        const agent = agents.find(a => a.id === agentId);

        if (!agent) {
            return NextResponse.json({
                success: false,
                error: 'Agent not found'
            }, { status: 404 });
        }

        // 获取 AI 设置 - 使用默认设置
        const settings = {
            provider: 'google-ai',
            apiKey: process.env.GOOGLE_AI_API_KEY || 'demo-key',
            defaultModel: 'gemini-1.5-flash'
        };

        // 构建对话上下文
        let conversationContext = '';
        if (sessionId) {
            // 获取最近的对话历史
            const recentMessages = await db.getRecentMessages(sessionId, 10);
            if (recentMessages.length > 0) {
                conversationContext = '\n\n**对话历史:**\n' +
                    recentMessages.map(msg =>
                        `${msg.isFromBot ? '助手' : '用户'}: ${msg.messageText}`
                    ).join('\n');
            }
        }

        // 构建完整的提示词
        const fullPrompt = `${agent.prompt}${conversationContext}

**当前用户消息:** ${message}

请根据上述系统设定和对话历史，为用户提供合适的回复。回复应该：
1. 符合智能体的角色设定
2. 考虑对话上下文
3. 提供有价值的帮助
4. 保持一致的语调和风格`;

        // 调用 AI API 生成回复
        let aiResponse = '';
        try {
            // 模拟AI响应（开发环境使用）
            if (process.env.NODE_ENV === 'development' || !settings.apiKey || settings.apiKey === 'demo-key') {
                aiResponse = await simulateAIResponse(message, agent);
            } else {
                switch (settings.provider) {
                    case 'google-ai':
                        aiResponse = await callGeminiAPI(fullPrompt, settings.apiKey, agent.model || settings.defaultModel);
                        break;
                    case 'openai':
                        aiResponse = await callOpenAIAPI(fullPrompt, settings.apiKey, agent.model || settings.defaultModel);
                        break;
                    case 'anthropic':
                        aiResponse = await callClaudeAPI(fullPrompt, settings.apiKey, agent.model || settings.defaultModel);
                        break;
                    case 'deepseek':
                        aiResponse = await callDeepSeekAPI(fullPrompt, settings.apiKey, agent.model || settings.defaultModel);
                        break;
                    default:
                        throw new Error(`Unsupported AI provider: ${settings.provider}`);
                }
            }
        } catch (error) {
            console.error('AI API call failed:', error);
            aiResponse = '抱歉，我遇到了技术问题，无法正常回复。请稍后再试或联系人工客服。';
        }

        // 保存 AI 回复到本地数据库和 Firestore
        if (sessionId && channelId) {
            // 保存到本地数据库
            const savedMessage = await db.addMessage({
                sessionId,
                content: aiResponse,
                isFromBot: true,
                fromUser: 'assistant',
                toUser: fromUser || 'user',
                channelId: channelId,
                agentId: agentId,
                timestamp: new Date()
            });

            // 保存到 Firestore
            const firestoreMessage = {
                id: savedMessage.id,
                conversationId: sessionId,
                channelId: channelId,
                from: 'bot' as const,
                to: fromUser || 'user',
                fromUser: 'assistant',
                text: aiResponse,
                timestamp: new Date().toISOString(),
                messageType: 'text' as any,
                metadata: {
                    isAutoReply: true,
                    aiAgent: {
                        agentId: agent.id,
                        agentName: agent.name,
                        provider: agent.provider || settings.provider,
                        model: agent.model || settings.defaultModel
                    }
                },
                read: true,
                createdAt: new Date().toISOString(),
            };

            try {
                await firestoreService.saveMessage(firestoreMessage);
                console.log(`AI response saved to Firestore: ${savedMessage.id}`);
            } catch (firestoreError) {
                console.error('Failed to save AI response to Firestore:', firestoreError);
                // 继续执行，不让 Firestore 错误阻止响应
            }
        } return NextResponse.json({
            success: true,
            response: aiResponse,
            agentInfo: {
                id: agent.id,
                name: agent.name,
                provider: agent.provider,
                model: agent.model
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI agent response error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate AI response',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Google Gemini API 调用
async function callGeminiAPI(prompt: string, apiKey: string, model: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate response';
}

// OpenAI API 调用
async function callOpenAIAPI(prompt: string, apiKey: string, model: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Failed to generate response';
}

// Claude API 调用
async function callClaudeAPI(prompt: string, apiKey: string, model: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 1024,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'Failed to generate response';
}

// DeepSeek API 调用
async function callDeepSeekAPI(prompt: string, apiKey: string, model: string): Promise<string> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Failed to generate response';
}

// 模拟AI响应（开发环境使用）
async function simulateAIResponse(userMessage: string, agent: any): Promise<string> {
    // 模拟响应延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responses = [
        "感谢您的消息！我很乐意为您提供帮助。请问您有什么具体的问题吗？",
        "我理解您的需求。让我为您提供一些相关信息来帮助您解决问题。",
        "这是一个很好的问题！让我为您详细解释一下相关的内容。",
        "感谢您联系我们！我会确保及时处理您的咨询。",
        "我明白您的意思。让我为您提供一些建议和解决方案。",
        "您的请求对我们很重要。我会为您提供全面的回答。",
        "我了解您的情况。让我为您提供最适合的帮助。",
        "谢谢您的耐心等待。根据您的描述，我建议您考虑以下几点：",
        "我理解您的困惑。让我为您澄清一下相关的问题。",
        "感谢您的反馈！我会认真考虑您的意见并为您提供帮助。"
    ];

    if (agent && agent.name) {
        return `[${agent.name}]: ${responses[Math.floor(Math.random() * responses.length)]}`;
    }

    return responses[Math.floor(Math.random() * responses.length)];
}
