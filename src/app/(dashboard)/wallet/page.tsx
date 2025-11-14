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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, Download, Upload, Wallet } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  reference: string;
}

interface WalletBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'credit',
    amount: 100.00,
    description: '账户充值',
    status: 'completed',
    date: '2025-01-15T10:30:00Z',
    reference: 'REF-001'
  },
  {
    id: '2',
    type: 'debit',
    amount: 25.50,
    description: 'AI智能体服务费',
    status: 'completed',
    date: '2025-01-14T15:20:00Z',
    reference: 'REF-002'
  },
  {
    id: '3',
    type: 'debit',
    amount: 10.00,
    description: 'WhatsApp渠道费用',
    status: 'completed',
    date: '2025-01-13T09:15:00Z',
    reference: 'REF-003'
  },
  {
    id: '4',
    type: 'credit',
    amount: 50.00,
    description: '账户充值',
    status: 'pending',
    date: '2025-01-12T14:45:00Z',
    reference: 'REF-004'
  },
  {
    id: '5',
    type: 'debit',
    amount: 5.00,
    description: '短信服务费',
    status: 'completed',
    date: '2025-01-11T11:30:00Z',
    reference: 'REF-005'
  }
];

const mockBalance: WalletBalance = {
  balance: 109.50,
  currency: 'CNY',
  lastUpdated: '2025-01-15T10:30:00Z'
};

export default function WalletPage() {
  const { toast } = useToast();
  const [balance, setBalance] = useState<WalletBalance>(mockBalance);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      toast({
        title: "充值失败",
        description: "请输入有效的充值金额",
        variant: "destructive"
      });
      return;
    }

    setIsRecharging(true);

    // 模拟充值过程
    setTimeout(() => {
      const amount = parseFloat(rechargeAmount);
      const newTransaction: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'credit',
        amount: amount,
        description: '账户充值',
        status: 'pending',
        date: new Date().toISOString(),
        reference: `REF-${Date.now()}`
      };

      setTransactions(prev => [newTransaction, ...prev]);
      setRechargeAmount('');

      toast({
        title: "充值申请已提交",
        description: `充值金额: ¥${amount.toFixed(2)}，请等待处理完成`,
      });

      setIsRecharging(false);
    }, 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: balance.currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive'
    } as const;

    const labels = {
      completed: '已完成',
      pending: '处理中',
      failed: '失败'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeIcon = (type: Transaction['type']) => {
    return type === 'credit' ?
      <Upload className="h-4 w-4 text-green-600" /> :
      <Download className="h-4 w-4 text-red-600" />;
  };

  const totalCredits = transactions
    .filter(tx => tx.type === 'credit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalDebits = transactions
    .filter(tx => tx.type === 'debit' && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">钱包管理</h1>
        <p className="text-muted-foreground">
          管理您的账户余额和交易记录
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">账户余额</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance.balance)}</div>
            <p className="text-xs text-muted-foreground">
              最后更新: {formatDate(balance.lastUpdated)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCredits)}
            </div>
            <p className="text-xs text-muted-foreground">
              累计充值金额
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总支出</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDebits)}
            </div>
            <p className="text-xs text-muted-foreground">
              累计消费金额
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">可用额度</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance.balance)}</div>
            <p className="text-xs text-muted-foreground">
              当前可用余额
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">交易记录</TabsTrigger>
          <TabsTrigger value="recharge">账户充值</TabsTrigger>
          <TabsTrigger value="billing">账单管理</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>交易记录</CardTitle>
              <CardDescription>
                查看您的所有交易记录和状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>参考号</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.type === 'credit' ? '收入' : '支出'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className={`text-right font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.reference}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recharge" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>账户充值</CardTitle>
                <CardDescription>
                  为您的账户充值以继续使用服务
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">充值金额 (CNY)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="请输入充值金额"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    min="1"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setRechargeAmount('50')}
                  >
                    ¥50
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRechargeAmount('100')}
                  >
                    ¥100
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRechargeAmount('200')}
                  >
                    ¥200
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setRechargeAmount('500')}
                  >
                    ¥500
                  </Button>
                </div>

                <Button
                  className="w-full"
                  onClick={handleRecharge}
                  disabled={isRecharging || !rechargeAmount}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {isRecharging ? '处理中...' : `充值 ¥${rechargeAmount || '0'}`}
                </Button>

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">充值说明</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 充值金额将立即添加到您的账户余额</li>
                    <li>• 支持支付宝、微信支付、银行卡支付</li>
                    <li>• 充值成功后即可使用所有付费功能</li>
                    <li>• 如有问题请联系客服</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>充值记录</CardTitle>
                <CardDescription>
                  最近充值记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions
                    .filter(tx => tx.type === 'credit')
                    .slice(0, 5)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            +{formatCurrency(transaction.amount)}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>账单管理</CardTitle>
              <CardDescription>
                查看和管理您的服务账单
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">当前套餐</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">专业版套餐</p>
                      <p className="text-sm text-muted-foreground">
                        包含所有高级功能，无使用限制
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">¥299/月</p>
                      <p className="text-sm text-muted-foreground">
                        下次扣费: 2025-02-15
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">用量统计</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">AI消息数</p>
                      <p className="font-medium">1,245 条</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">渠道消息数</p>
                      <p className="font-medium">3,567 条</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">媒体存储</p>
                      <p className="font-medium">125 MB / 1 GB</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">活跃用户</p>
                      <p className="font-medium">89 人</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline">升级套餐</Button>
                  <Button variant="outline">下载发票</Button>
                  <Button variant="outline">联系客服</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
