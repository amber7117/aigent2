'use client';

import {
  Bot,
  MoreVertical,
  PlusCircle,
  MessageSquare,
  Sparkles,
  Settings,
  Wand2,
  Target,
  Brain,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createAgent, getAIAgents, getChannels, deleteAgent } from '@/lib/api';
import type { AIAgent, Channel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { aiService, predefinedRoles, type AgentRole, type PromptGenerationParams } from '@/lib/ai-service';
import { AISettingsModal } from '@/components/ai-settings-modal';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

function CreateAgentDialog({
  onAgentCreate,
}: {
  onAgentCreate: (agent: AIAgent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<'OpenAI' | 'DeepSeek' | 'Gemini'>('Gemini');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AgentRole | null>(null);
  const [companyInfo, setCompanyInfo] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'friendly' | 'professional'>('professional');
  const [generationMethod, setGenerationMethod] = useState<'template' | 'ai' | 'manual'>('template');
  const { toast } = useToast();

  const modelOptions = {
    'OpenAI': [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    'Gemini': [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-pro', label: 'Gemini Pro' },
    ],
    'DeepSeek': [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ],
  };

  const handleProviderChange = (newProvider: 'OpenAI' | 'DeepSeek' | 'Gemini') => {
    setProvider(newProvider);
    setModel(modelOptions[newProvider][0].value);
  };

  const handleRoleSelect = async (role: AgentRole) => {
    setSelectedRole(role);
    setName(role.name);
    setDescription(role.description);

    // 根据角色生成 prompt
    const params: PromptGenerationParams = {
      role,
      companyInfo,
      productInfo,
      specialInstructions,
      tone,
    };

    const prompt = await aiService.generateAgentPrompt(params);
    setGeneratedPrompt(prompt);
  };

  const handleGeneratePrompt = async () => {
    if (generationMethod === 'template' && !selectedRole) {
      toast({
        variant: "destructive",
        description: "请先选择一个角色模板"
      });
      return;
    }

    if (generationMethod === 'ai' && !description) {
      toast({
        variant: "destructive",
        description: "请先填写智能体描述"
      });
      return;
    }

    setIsGenerating(true);

    try {
      let prompt = '';

      if (generationMethod === 'template' && selectedRole) {
        const params: PromptGenerationParams = {
          role: selectedRole,
          companyInfo,
          productInfo,
          specialInstructions,
          tone,
        };
        prompt = await aiService.generateAgentPrompt(params);
      } else if (generationMethod === 'ai') {
        const context = [companyInfo, productInfo, specialInstructions].filter(Boolean).join('\n');
        prompt = await aiService.generateCustomPrompt(description, context || undefined);
      }

      setGeneratedPrompt(prompt);
      toast({ description: "智能体 Prompt 生成成功！" });
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "Prompt 生成失败"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setGeneratedPrompt('');
    setSelectedRole(null);
    setCompanyInfo('');
    setProductInfo('');
    setSpecialInstructions('');
    setTone('professional');
    setGenerationMethod('template');
    setProvider('Gemini');
    setModel('gemini-1.5-flash');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !generatedPrompt || !model) return;

    try {
      const newAgent = await createAgent({
        name,
        description,
        prompt: generatedPrompt,
        provider,
        model,
        channelIds: [],
      });
      onAgentCreate(newAgent);

      resetForm();
      setOpen(false);
      toast({ description: `智能体 "${name}" 创建成功！` });
    } catch (error) {
      toast({ variant: "destructive", description: "创建智能体失败" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          创建智能体
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>创建新的 AI 智能体</DialogTitle>
            </VisuallyHidden>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              创建新的 AI 智能体
            </DialogTitle>
            <DialogDescription>
              配置一个新的智能体来自动化对话处理
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Tabs value={generationMethod} onValueChange={(value) => setGenerationMethod(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="template" className="gap-2">
                  <Target className="h-4 w-4" />
                  角色模板
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Brain className="h-4 w-4" />
                  AI 生成
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  手动编写
                </TabsTrigger>
              </TabsList>

              {/* 角色模板选择 */}
              <TabsContent value="template" className="space-y-4">
                <div>
                  <Label>选择预定义角色</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {predefinedRoles.map((role) => (
                      <Card
                        key={role.type}
                        className={`cursor-pointer transition-colors ${selectedRole?.type === role.type
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                          }`}
                        onClick={() => handleRoleSelect(role)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{role.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {role.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1">
                            {role.skills.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 角色定制 */}
                {selectedRole && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium">定制 {selectedRole.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyInfo">公司信息</Label>
                        <Textarea
                          id="companyInfo"
                          placeholder="简介公司背景、业务范围等"
                          value={companyInfo}
                          onChange={(e) => setCompanyInfo(e.target.value)}
                          className="h-20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="productInfo">产品/服务信息</Label>
                        <Textarea
                          id="productInfo"
                          placeholder="描述主要产品或服务特点"
                          value={productInfo}
                          onChange={(e) => setProductInfo(e.target.value)}
                          className="h-20"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="specialInstructions">特殊指令</Label>
                      <Textarea
                        id="specialInstructions"
                        placeholder="添加特定的行为指导或限制"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="h-16"
                      />
                    </div>
                    <div>
                      <Label>对话语调</Label>
                      <Select value={tone} onValueChange={(value) => setTone(value as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">专业正式</SelectItem>
                          <SelectItem value="friendly">友好亲切</SelectItem>
                          <SelectItem value="casual">轻松随和</SelectItem>
                          <SelectItem value="formal">严谨正式</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* AI 生成 */}
              <TabsContent value="ai" className="space-y-4">
                <div>
                  <Label htmlFor="description">智能体描述</Label>
                  <Textarea
                    id="description"
                    placeholder="详细描述智能体的目的和行为，例如：'一个专业的客服机器人，能够处理产品咨询、订单查询和售后服务...'"
                    className="min-h-[120px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyInfo">公司信息（可选）</Label>
                    <Textarea
                      id="companyInfo"
                      placeholder="公司背景信息"
                      value={companyInfo}
                      onChange={(e) => setCompanyInfo(e.target.value)}
                      className="h-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productInfo">产品信息（可选）</Label>
                    <Textarea
                      id="productInfo"
                      placeholder="产品或服务信息"
                      value={productInfo}
                      onChange={(e) => setProductInfo(e.target.value)}
                      className="h-20"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 手动编写 */}
              <TabsContent value="manual" className="space-y-4">
                <div>
                  <Label htmlFor="manualDescription">智能体描述</Label>
                  <Textarea
                    id="manualDescription"
                    placeholder="简单描述智能体的作用"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* 基础配置 */}
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">智能体名称 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="客服小助手"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="provider">AI 提供商</Label>
                  <Select value={provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择 AI 提供商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gemini">Google Gemini</SelectItem>
                      <SelectItem value="OpenAI">OpenAI</SelectItem>
                      <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">模型</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions[provider].map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 生成 Prompt 按钮 */}
              {generationMethod !== 'manual' && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={handleGeneratePrompt}
                    disabled={isGenerating}
                    size="lg"
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGenerating ? '生成中...' : `${generationMethod === 'template' ? '基于模板生成' : 'AI 生成'} Prompt`}
                  </Button>
                </div>
              )}

              {/* Prompt 编辑区 */}
              <div>
                <Label htmlFor="prompt">智能体 Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder={generationMethod === 'manual' ? '手动编写系统提示词...' : '点击上方按钮生成 Prompt，或手动编辑...'}
                  className="min-h-[200px] font-mono text-sm"
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!name || !generatedPrompt}>
              创建智能体
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const [agentsData, channelsData] = await Promise.all([getAIAgents(), getChannels()]);

      // Remove any potential duplicates by ID
      const uniqueAgents = agentsData.filter((agent, index, self) =>
        index === self.findIndex(a => a.id === agent.id)
      );

      setAgents(uniqueAgents);
      setChannels(channelsData);
    };
    fetchData();
  }, []);

  const handleCreateAgent = (newAgent: AIAgent) => {
    setAgents((prevAgents) => {
      // Ensure no duplicates when adding new agent
      const filtered = prevAgents.filter(a => a.id !== newAgent.id);
      return [...filtered, newAgent];
    });
  };

  const handleDeleteRequest = (agent: AIAgent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (agentToDelete) {
      await deleteAgent(agentToDelete.id);
      setAgents(agents.filter((a) => a.id !== agentToDelete.id));
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
      toast({ description: `智能体 "${agentToDelete.name}" 已删除` });
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'OpenAI':
        return 'bg-green-100 text-green-800';
      case 'Gemini':
        return 'bg-blue-100 text-blue-800';
      case 'DeepSeek':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI 智能体</h1>
          <p className="text-muted-foreground">
            创建和管理 AI 智能体来自动化客户对话
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setSettingsDialogOpen(true)}
          >
            <Settings className="h-3.5 w-3.5" />
            AI 设置
          </Button>
          <CreateAgentDialog onAgentCreate={handleCreateAgent} />
        </div>
      </div>

      {/* AI 智能体列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent: AIAgent, index) => (
          <Card key={`${agent.id}-${index}`} className="relative">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <Badge className={`text-xs ${getProviderBadgeColor(agent.provider || 'Unknown')}`}>
                    {agent.provider} {agent.model}
                  </Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>操作</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => toast({ description: "编辑功能开发中" })}>
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({ description: "复制功能开发中" })}>
                    复制
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({ description: "测试功能开发中" })}>
                    测试对话
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteRequest(agent)}
                  >
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground min-h-[40px]">{agent.description}</p>
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">系统提示词预览:</div>
                <div className="text-xs bg-muted/50 p-2 rounded font-mono max-h-20 overflow-hidden">
                  {agent.prompt?.substring(0, 100)}...
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex flex-col gap-2 text-sm w-full">
                <h4 className="font-medium">活跃渠道:</h4>
                <div className="flex flex-wrap gap-2 min-h-[24px]">
                  {(agent.channelIds || []).length > 0 ? (
                    (agent.channelIds || []).map((id) => {
                      const channel = channels.find((c) => c.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {channel?.name || 'Unknown Channel'}
                        </Badge>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground">暂未分配渠道</p>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {agents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">还没有智能体</h3>
            <p className="text-muted-foreground mb-4">
              创建您的第一个 AI 智能体来开始自动化客户对话
            </p>
            <CreateAgentDialog onAgentCreate={handleCreateAgent} />
          </CardContent>
        </Card>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除智能体{' '}
              <span className="font-semibold text-foreground">"{agentToDelete?.name}"</span>{' '}
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI 设置对话框 */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <AISettingsModal onClose={() => setSettingsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
