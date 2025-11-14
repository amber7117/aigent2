'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FacebookLogo } from '@/components/icons/facebook-logo';
import { WhatsAppLogo } from '@/components/icons/whatsapp-logo';
import { WeChatLogo } from '@/components/icons/wechat-logo';
import { TelegramLogo } from '@/components/icons/telegram-logo';
import { MessagesSquare, Link, Link2Off, TrendingUp, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

const TikTokLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16.5 6.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    <path d="M12 11v8.5" />
    <path d="M12 2v4.5" />
    <path d="m15.5 4.5-3 3-3-3" />
  </svg>
);

const MicrosoftLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M11.5 3H3v8.5h8.5V3zm-1 1h-6.5v6.5h6.5v-6.5zM21 3h-8.5v8.5H21V3zm-1 1h-6.5v6.5h6.5v-6.5zM11.5 12.5H3V21h8.5v-8.5zm-1 1h-6.5v6.5h6.5v-6.5zM21 12.5h-8.5V21H21v-8.5zm-1 1h-6.5v6.5h6.5v-6.5z" />
  </svg>
);

interface MarketingIntegration {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  platform: string;
  connected: boolean;
}

// Configuration Dialog Component
function ConfigurationDialog({
  platform,
  title,
  onConnect,
  loading
}: {
  platform: string;
  title: string;
  onConnect: (credentials: any) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState({
    accessToken: '',
    apiKey: '',
    accountId: '',
    businessId: '',
    sessionId: '',
    botToken: '',
    channelId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty credentials
    const filteredCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([_, value]) => value.trim() !== '')
    );
    onConnect(filteredCredentials);
    setOpen(false);
  };

  const getPlatformFields = () => {
    switch (platform) {
      case 'facebook':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                placeholder="Enter Facebook Access Token"
                value={credentials.accessToken}
                onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessId">Business ID</Label>
              <Input
                id="businessId"
                placeholder="Enter Business ID (optional)"
                value={credentials.businessId}
                onChange={(e) => setCredentials(prev => ({ ...prev, businessId: e.target.value }))}
              />
            </div>
          </>
        );
      case 'microsoft':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                placeholder="Enter Microsoft Ads API Key"
                value={credentials.apiKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountId">Account ID</Label>
              <Input
                id="accountId"
                placeholder="Enter Account ID"
                value={credentials.accountId}
                onChange={(e) => setCredentials(prev => ({ ...prev, accountId: e.target.value }))}
              />
            </div>
          </>
        );
      case 'tiktok':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                placeholder="Enter TikTok Access Token"
                value={credentials.accessToken}
                onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountId">Advertiser ID</Label>
              <Input
                id="accountId"
                placeholder="Enter Advertiser ID"
                value={credentials.accountId}
                onChange={(e) => setCredentials(prev => ({ ...prev, accountId: e.target.value }))}
              />
            </div>
          </>
        );
      case 'whatsapp':
        return (
          <div className="space-y-2">
            <Label htmlFor="sessionId">Session ID</Label>
            <Input
              id="sessionId"
              placeholder="Enter WhatsApp Session ID"
              value={credentials.sessionId}
              onChange={(e) => setCredentials(prev => ({ ...prev, sessionId: e.target.value }))}
            />
          </div>
        );
      case 'wechat':
        return (
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Input
              id="accessToken"
              placeholder="Enter WeChat Access Token"
              value={credentials.accessToken}
              onChange={(e) => setCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
            />
          </div>
        );
      case 'telegram':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                placeholder="Enter Telegram Bot Token"
                value={credentials.botToken}
                onChange={(e) => setCredentials(prev => ({ ...prev, botToken: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channelId">Channel ID</Label>
              <Input
                id="channelId"
                placeholder="Enter Channel ID (optional)"
                value={credentials.channelId}
                onChange={(e) => setCredentials(prev => ({ ...prev, channelId: e.target.value }))}
              />
            </div>
          </>
        );
      case 'forum':
        return (
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              placeholder="Enter Forum API Key"
              value={credentials.apiKey}
              onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
            />
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              placeholder="Enter API Key"
              value={credentials.apiKey}
              onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure {title}</DialogTitle>
          <DialogDescription>
            Enter your {title} credentials to connect and start managing campaigns.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {getPlatformFields()}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketingPage() {
  const [integrations, setIntegrations] = useState<MarketingIntegration[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [connections, setConnections] = useState<any[]>([]);

  const marketingIntegrations: MarketingIntegration[] = [
    {
      title: 'Facebook Ads',
      description: 'Manage and track your Facebook and Instagram ad campaigns.',
      icon: FacebookLogo,
      platform: 'facebook',
      connected: false,
    },
    {
      title: 'Microsoft Ads',
      description: 'Connect your Microsoft Advertising account to import campaign data.',
      icon: MicrosoftLogo,
      platform: 'microsoft',
      connected: false,
    },
    {
      title: 'TikTok Ads',
      description: 'Integrate with TikTok Ads Manager for campaign insights.',
      icon: TikTokLogo,
      platform: 'tiktok',
      connected: false,
    },
    {
      title: 'WhatsApp Broadcast',
      description: 'Send bulk messages and campaigns to your WhatsApp contacts.',
      icon: WhatsAppLogo,
      platform: 'whatsapp',
      connected: false,
    },
    {
      title: 'WeChat Moments',
      description: 'Publish promotional content to your official account\'s Moments.',
      icon: WeChatLogo,
      platform: 'wechat',
      connected: false,
    },
    {
      title: 'Telegram Publisher',
      description: 'Post updates and announcements to your groups and channels.',
      icon: TelegramLogo,
      platform: 'telegram',
      connected: false,
    },
    {
      title: 'Forum Publisher',
      description: 'Automate posting to various online forums and communities.',
      icon: MessagesSquare,
      platform: 'forum',
      connected: false,
    },
  ];

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/marketing?action=connections');
      const result = await response.json();

      if (result.success) {
        setConnections(result.connections);

        // Update integration status
        const updatedIntegrations = marketingIntegrations.map(integration => ({
          ...integration,
          connected: result.connections.some((conn: any) => conn.platform === integration.platform && conn.status === 'connected')
        }));

        setIntegrations(updatedIntegrations);
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
      setIntegrations(marketingIntegrations);
    }
  };

  const handleConnect = async (platform: string, credentials?: any) => {
    setLoading(prev => ({ ...prev, [platform]: true }));

    try {
      // Use provided credentials or simulate if none provided
      const finalCredentials = credentials || {
        accessToken: `demo_token_${platform}`,
        accountId: `demo_account_${platform}`
      };

      const response = await fetch('/api/marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'connect',
          platform,
          credentials: finalCredentials
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadConnections(); // Reload connections
        alert(`Successfully connected to ${platform}!`);
      } else {
        alert(`Failed to connect: ${result.error}`);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Connection failed. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleDisconnect = async (platform: string) => {
    setLoading(prev => ({ ...prev, [platform]: true }));

    try {
      const response = await fetch('/api/marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disconnect',
          platform
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadConnections(); // Reload connections
      } else {
        alert(`Failed to disconnect: ${result.error}`);
      }
    } catch (error) {
      console.error('Disconnection failed:', error);
      alert('Disconnection failed. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleCreateCampaign = async (platform: string) => {
    setLoading(prev => ({ ...prev, [`campaign_${platform}`]: true }));

    try {
      const campaignData = {
        name: `Demo Campaign - ${platform}`,
        budget: 1000,
        targetAudience: 'General',
        message: 'This is a demo campaign message',
        recipients: ['user1@example.com', 'user2@example.com']
      };

      const response = await fetch('/api/marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-campaign',
          platform,
          campaignData
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Campaign created successfully! Campaign ID: ${result.campaignId}`);
      } else {
        alert(`Failed to create campaign: ${result.error}`);
      }
    } catch (error) {
      console.error('Campaign creation failed:', error);
      alert('Campaign creation failed. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [`campaign_${platform}`]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing Platform</h1>
        <p className="text-muted-foreground">
          Integrate and manage your marketing campaigns across all channels.
        </p>
      </div>

      {/* Connected Platforms Summary */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Connected Platforms
            </CardTitle>
            <CardDescription>
              {connections.length} platform{connections.length !== 1 ? 's' : ''} connected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {connections.map((connection) => (
                <Badge key={connection.id} variant="secondary" className="capitalize">
                  {connection.platform}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isConnecting = loading[integration.platform];
          const isCreatingCampaign = loading[`campaign_${integration.platform}`];

          return (
            <Card key={integration.title} className="relative">
              {integration.connected && (
                <div className="absolute top-3 right-3">
                  <Badge variant="default" className="bg-green-500">
                    <Link className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              )}

              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle>{integration.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>

                <div className="space-y-2">
                  {!integration.connected ? (
                    <>
                      <ConfigurationDialog
                        platform={integration.platform}
                        title={integration.title}
                        onConnect={(credentials) => handleConnect(integration.platform, credentials)}
                        loading={isConnecting}
                      />
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleConnect(integration.platform)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Quick Connect...
                          </>
                        ) : (
                          <>
                            <Link className="h-4 w-4 mr-2" />
                            Quick Connect
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCreateCampaign(integration.platform)}
                        disabled={isCreatingCampaign}
                      >
                        {isCreatingCampaign ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Create Campaign
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDisconnect(integration.platform)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <Link2Off className="h-4 w-4 mr-2" />
                            Disconnect
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
