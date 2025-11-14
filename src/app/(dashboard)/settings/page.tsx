'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getAISettings, saveAISettings, getLoggedInUser, updateUser } from '@/lib/api';
import type { AISettings, User } from '@/lib/types';
import React, { useEffect, useState } from 'react';

type Provider = 'google-ai' | 'openai' | 'anthropic' | 'deepseek';

const modelOptions: Record<Provider, { value: string; label: string }[]> = {
  'google-ai': [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-pro', label: 'Gemini Pro' },
  ],
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  ],
};

function AITabContent() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const savedSettings = await getAISettings();
      setSettings(savedSettings);
    };
    fetchSettings();
  }, []);

  const handleProviderChange = (value: string) => {
    const newProvider = value as Provider;
    if (settings) {
      setSettings({
        ...settings,
        provider: newProvider,
        defaultModel: modelOptions[newProvider][0].value,
      });
    }
  };

  const handleSave = async () => {
    if (settings) {
      await saveAISettings(settings);
      toast({
        title: 'Settings Saved',
        description: 'Your AI settings have been successfully saved.',
      });
    }
  };

  if (!settings) {
    return <div>Loading AI settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
        <CardDescription>
          选择并配置您首选的 AI 提供商。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ai-provider">AI Provider</Label>
          <Select value={settings.provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="ai-provider">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google-ai">Google AI (Gemini)</SelectItem>
              <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your API key"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default-model">Default Model</Label>
          <Select value={settings.defaultModel} onValueChange={(value) => setSettings({ ...settings, defaultModel: value })}>
            <SelectTrigger id="default-model">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions[settings.provider].map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            这是将在整个应用程序的 AI 功能中使用的默认模型。
          </p>
        </div>
        <Button onClick={handleSave}>Save AI Settings</Button>
      </CardContent>
    </Card>
  )
}


export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const loggedInUser = await getLoggedInUser();
      setUser(loggedInUser);
    };
    fetchUser();
  }, []);

  const handleProfileUpdate = async () => {
    if (user) {
      await updateUser(user.id, { name: user.name, email: user.email });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    }
  };

  const widgetScript = `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-project-id="YOUR_PROJECT_ID" async></script>`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(widgetScript);
    toast({
      title: "Copied!",
      description: "The widget script has been copied to your clipboard.",
    });
  };

  if (!user) {
    return <div>Loading user settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, preferences, and workspace settings.
        </p>
      </div>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
              </div>
              <Button onClick={handleProfileUpdate}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <AITabContent />
        </TabsContent>
        <TabsContent value="widget" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Website Widget</CardTitle>
              <CardDescription>
                Embed the OmniChat widget on your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="widget-script">Embed Script</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Copy and paste this script into the &lt;head&gt; section of your website.
                </p>
                <pre className="overflow-x-auto rounded-md bg-muted p-4 font-code text-sm text-muted-foreground">
                  <code>{widgetScript}</code>
                </pre>
              </div>
              <Button variant="outline" onClick={handleCopyScript}>Copy Script</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings and security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Account Information</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Account ID</Label>
                    <p className="text-sm text-muted-foreground">{user.id}</p>
                  </div>
                  <div>
                    <Label>Member Since</Label>
                    <p className="text-sm text-muted-foreground">January 2024</p>
                  </div>
                  <div>
                    <Label>Subscription Plan</Label>
                    <p className="text-sm text-muted-foreground">Professional Plan</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security</h3>
                <Button variant="outline">Change Password</Button>
                <div>
                  <Button variant="outline">Enable Two-Factor Authentication</Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add an extra layer of security to your account.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                <div className="border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-medium">Delete Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive" className="mt-2">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select defaultValue="system">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme for the application.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sidebar</Label>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Show sidebar by default</span>
                </div>
              </div>

              <Button>Save Appearance Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Messages</Label>
                      <p className="text-sm text-muted-foreground">Get notified when you receive new messages</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Channel Updates</Label>
                      <p className="text-sm text-muted-foreground">Notifications about channel connection status</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Marketing Campaigns</Label>
                      <p className="text-sm text-muted-foreground">Updates about your marketing campaigns</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium">Push Notifications</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real-time Messages</Label>
                      <p className="text-sm text-muted-foreground">Instant notifications for new messages</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI Agent Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notifications from your AI agents</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium">Quiet Hours</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Quiet Hours</Label>
                      <p className="text-sm text-muted-foreground">Disable notifications during specified hours</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" defaultValue="08:00" />
                    </div>
                  </div>
                </div>
              </div>

              <Button>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
