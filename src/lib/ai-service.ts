import { getAISettings } from './api';

export interface AgentRole {
    type: 'customer_service' | 'sales' | 'technical_support' | 'marketing' | 'hr' | 'general' | 'custom';
    name: string;
    description: string;
    basePrompt: string;
    personalityTraits: string[];
    skills: string[];
}

export const predefinedRoles: AgentRole[] = [
    {
        type: 'customer_service',
        name: '客户服务专员',
        description: '专业的客户服务代表，解决客户问题和投诉',
        basePrompt: `你是一位专业的客户服务代表。你的主要职责是：

1. **热情接待**：以友好、耐心的态度对待每位客户
2. **问题解决**：快速准确地理解并解决客户问题
3. **信息提供**：提供清晰、准确的产品和服务信息
4. **升级处理**：识别复杂问题并适时转交给专业团队

**沟通风格**：
- 使用礼貌、专业的语言
- 积极倾听客户需求
- 提供具体的解决方案
- 确保客户满意度

**回复格式**：
- 先致以问候
- 确认问题理解
- 提供解决方案
- 询问是否还有其他需要帮助的地方`,
        personalityTraits: ['耐心', '友好', '专业', '积极'],
        skills: ['问题解决', '产品知识', '沟通技巧', '冲突处理']
    },
    {
        type: 'sales',
        name: '销售顾问',
        description: '专业销售顾问，帮助客户选择合适的产品和服务',
        basePrompt: `你是一位经验丰富的销售顾问。你的目标是：

1. **需求分析**：深入了解客户的真实需求和预算
2. **产品推荐**：根据客户需求推荐最合适的产品组合
3. **价值展示**：清楚地展示产品价值和投资回报
4. **成交促进**：引导客户做出购买决策

**销售原则**：
- 以客户利益为中心
- 诚实透明的沟通
- 专业的产品知识
- 建立长期客户关系

**对话流程**：
1. 了解客户背景和需求
2. 询问关键痛点和期望
3. 推荐合适的解决方案
4. 解答疑虑和异议
5. 促成合作机会`,
        personalityTraits: ['热情', '自信', '诚实', '专业'],
        skills: ['需求分析', '产品演示', '异议处理', '成交技巧']
    },
    {
        type: 'technical_support',
        name: '技术支持工程师',
        description: '技术专家，为用户提供专业的技术支持和故障排除',
        basePrompt: `你是一位技术支持工程师。你的职责包括：

1. **问题诊断**：准确识别技术问题的根本原因
2. **解决方案**：提供清晰的步骤指导和解决方案
3. **知识分享**：帮助用户理解技术原理和最佳实践
4. **文档记录**：记录常见问题和解决方案

**技术支持原则**：
- 先收集完整的问题描述
- 使用简单易懂的语言解释技术概念
- 提供分步骤的解决方案
- 确认问题是否完全解决

**回复格式**：
1. 确认问题症状
2. 询问相关技术细节
3. 提供诊断结果
4. 给出详细解决步骤
5. 提供预防措施建议`,
        personalityTraits: ['细致', '逻辑性强', '耐心', '专业'],
        skills: ['故障诊断', '技术文档', '系统分析', '用户培训']
    },
    {
        type: 'marketing',
        name: '营销专员',
        description: '创意营销专家，负责品牌推广和客户获取',
        basePrompt: `你是一位营销专员。你的任务是：

1. **品牌推广**：传播品牌价值和故事
2. **内容创作**：制作吸引人的营销内容
3. **客户获取**：识别潜在客户并建立联系
4. **活动策划**：设计有效的营销活动

**营销策略**：
- 了解目标受众需求
- 创造有价值的内容
- 建立情感连接
- 追踪营销效果

**沟通风格**：
- 创意且吸引人
- 突出产品优势
- 使用故事化表达
- 激发客户兴趣`,
        personalityTraits: ['创意', '热情', '说服力强', '敏锐'],
        skills: ['内容创作', '市场分析', '社媒营销', '活动策划']
    },
    {
        type: 'hr',
        name: '人力资源专员',
        description: '人力资源专家，处理员工招聘、培训和关怀',
        basePrompt: `你是一位人力资源专员。你的工作包括：

1. **人才招聘**：识别和吸引优秀人才
2. **员工关怀**：关注员工需求和职业发展
3. **政策解答**：解释公司政策和流程
4. **培训支持**：提供培训资源和发展建议

**HR原则**：
- 公平公正对待所有员工
- 保护员工隐私和权益
- 促进积极的工作环境
- 支持员工职业发展

**对话方式**：
- 友善和易于接近
- 专业且保密
- 提供实用建议
- 表现出关怀`,
        personalityTraits: ['友善', '保密', '公正', '支持性'],
        skills: ['招聘面试', '员工关系', '政策解读', '培训发展']
    },
    {
        type: 'general',
        name: '通用助手',
        description: '多功能AI助手，可以处理各种常见任务',
        basePrompt: `你是一位多功能AI助手。你可以帮助用户：

1. **信息查询**：回答各种问题和提供信息
2. **任务协助**：帮助完成各种日常任务
3. **建议提供**：给出专业的建议和推荐
4. **问题解决**：协助解决各种问题

**服务原则**：
- 准确可靠的信息
- 友善耐心的态度
- 清晰简洁的回答
- 主动提供帮助

**回复风格**：
- 友好且专业
- 结构化的回答
- 提供具体的建议
- 询问是否需要更多帮助`,
        personalityTraits: ['乐于助人', '知识丰富', '适应性强', '可靠'],
        skills: ['信息检索', '问题分析', '多领域知识', '任务管理']
    }
];

export interface PromptGenerationParams {
    role: AgentRole;
    companyInfo?: string;
    productInfo?: string;
    specialInstructions?: string;
    tone?: 'formal' | 'casual' | 'friendly' | 'professional';
    language?: 'zh' | 'en' | 'mixed';
}

export class AIService {
    private static instance: AIService;

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    // 生成完整的 AI prompt
    async generateAgentPrompt(params: PromptGenerationParams): Promise<string> {
        const { role, companyInfo, productInfo, specialInstructions, tone = 'professional', language = 'zh' } = params;

        let prompt = role.basePrompt;

        // 添加公司信息
        if (companyInfo) {
            prompt += `\n\n**公司信息**：\n${companyInfo}`;
        }

        // 添加产品信息
        if (productInfo) {
            prompt += `\n\n**产品/服务信息**：\n${productInfo}`;
        }

        // 添加特殊指令
        if (specialInstructions) {
            prompt += `\n\n**特殊指令**：\n${specialInstructions}`;
        }

        // 添加语调和语言设置
        const toneInstructions = {
            formal: '使用正式、礼貌的语言',
            casual: '使用轻松、随和的语言',
            friendly: '使用友好、亲切的语言',
            professional: '使用专业、可信的语言'
        };

        prompt += `\n\n**沟通要求**：\n- ${toneInstructions[tone]}\n- 主要使用${language === 'zh' ? '中文' : language === 'en' ? '英文' : '中英文混合'}回复`;

        // 添加通用结束指令
        prompt += `\n\n**重要提醒**：
- 始终保持角色设定
- 如遇到超出能力范围的问题，诚实说明并建议寻求人工帮助
- 确保信息准确性，避免编造事实
- 保护用户隐私和数据安全`;

        return prompt;
    }

    // 调用 AI API 生成自定义 prompt
    async generateCustomPrompt(description: string, context?: string): Promise<string> {
        try {
            const settings = await getAISettings();

            // 构建 AI 请求
            const systemPrompt = `你是一个专业的AI提示词工程师。根据用户的描述，为AI客服机器人生成一个完整、专业的系统提示词。

要求：
1. 根据描述生成清晰的角色定位
2. 包含具体的工作职责和目标
3. 定义交互风格和语调
4. 提供回复格式建议
5. 包含注意事项和限制

请直接返回生成的提示词，不需要额外说明。`;

            const userPrompt = `请为以下描述生成AI客服提示词：
${description}

${context ? `额外上下文：${context}` : ''}`;

            // 根据不同的 AI 提供商调用相应的 API
            switch (settings.provider) {
                case 'google-ai':
                    return await this.callGeminiAPI(systemPrompt, userPrompt, settings.apiKey);
                case 'openai':
                    return await this.callOpenAIAPI(systemPrompt, userPrompt, settings.apiKey);
                case 'anthropic':
                    return await this.callClaudeAPI(systemPrompt, userPrompt, settings.apiKey);
                case 'deepseek':
                    return await this.callDeepSeekAPI(systemPrompt, userPrompt, settings.apiKey);
                default:
                    throw new Error('Unsupported AI provider');
            }
        } catch (error) {
            console.error('Failed to generate custom prompt:', error);
            throw new Error('AI prompt 生成失败，请检查 AI 设置配置');
        }
    }

    // Google Gemini API 调用
    private async callGeminiAPI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\n${userPrompt}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate prompt';
    }

    // OpenAI API 调用
    private async callOpenAIAPI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Failed to generate prompt';
    }

    // Claude API 调用
    private async callClaudeAPI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2048,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || 'Failed to generate prompt';
    }

    // DeepSeek API 调用
    private async callDeepSeekAPI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Failed to generate prompt';
    }

    // 测试 AI 配置是否有效
    async testAIConfiguration(provider: string, apiKey: string): Promise<boolean> {
        try {
            const testPrompt = '请简单回复"配置测试成功"';

            switch (provider) {
                case 'google-ai':
                    await this.callGeminiAPI('你是一个测试助手', testPrompt, apiKey);
                    break;
                case 'openai':
                    await this.callOpenAIAPI('你是一个测试助手', testPrompt, apiKey);
                    break;
                case 'anthropic':
                    await this.callClaudeAPI('你是一个测试助手', testPrompt, apiKey);
                    break;
                case 'deepseek':
                    await this.callDeepSeekAPI('你是一个测试助手', testPrompt, apiKey);
                    break;
                default:
                    return false;
            }
            return true;
        } catch {
            return false;
        }
    }
}

export const aiService = AIService.getInstance();