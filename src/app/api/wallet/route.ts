import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

interface WalletTransaction {
    id: string;
    userId: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    date: string;
    reference: string;
    metadata?: {
        paymentMethod?: string;
        paymentId?: string;
        serviceType?: string;
    };
}

interface WalletBalance {
    userId: string;
    balance: number;
    currency: string;
    lastUpdated: string;
    totalCredits: number;
    totalDebits: number;
}

// Mock data for development
const mockWalletData: {
    balance: WalletBalance;
    transactions: WalletTransaction[];
} = {
    balance: {
        userId: 'user-1',
        balance: 109.50,
        currency: 'CNY',
        lastUpdated: '2025-01-15T10:30:00Z',
        totalCredits: 150.00,
        totalDebits: 40.50
    },
    transactions: [
        {
            id: '1',
            userId: 'user-1',
            type: 'credit',
            amount: 100.00,
            description: '账户充值',
            status: 'completed',
            date: '2025-01-15T10:30:00Z',
            reference: 'REF-001',
            metadata: {
                paymentMethod: 'alipay',
                paymentId: 'pay_001'
            }
        },
        {
            id: '2',
            userId: 'user-1',
            type: 'debit',
            amount: 25.50,
            description: 'AI智能体服务费',
            status: 'completed',
            date: '2025-01-14T15:20:00Z',
            reference: 'REF-002',
            metadata: {
                serviceType: 'ai_agent'
            }
        },
        {
            id: '3',
            userId: 'user-1',
            type: 'debit',
            amount: 10.00,
            description: 'WhatsApp渠道费用',
            status: 'completed',
            date: '2025-01-13T09:15:00Z',
            reference: 'REF-003',
            metadata: {
                serviceType: 'whatsapp'
            }
        },
        {
            id: '4',
            userId: 'user-1',
            type: 'credit',
            amount: 50.00,
            description: '账户充值',
            status: 'pending',
            date: '2025-01-12T14:45:00Z',
            reference: 'REF-004',
            metadata: {
                paymentMethod: 'wechat',
                paymentId: 'pay_002'
            }
        },
        {
            id: '5',
            userId: 'user-1',
            type: 'debit',
            amount: 5.00,
            description: '短信服务费',
            status: 'completed',
            date: '2025-01-11T11:30:00Z',
            reference: 'REF-005',
            metadata: {
                serviceType: 'sms'
            }
        }
    ]
};

// Get wallet balance and transactions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || 'user-1';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Filter transactions by user
        const userTransactions = mockWalletData.transactions
            .filter(tx => tx.userId === userId)
            .slice(offset, offset + limit);

        // Get user balance
        const userBalance = mockWalletData.balance.userId === userId
            ? mockWalletData.balance
            : {
                userId,
                balance: 0,
                currency: 'CNY',
                lastUpdated: new Date().toISOString(),
                totalCredits: 0,
                totalDebits: 0
            };

        return NextResponse.json({
            success: true,
            data: {
                balance: userBalance,
                transactions: userTransactions,
                pagination: {
                    total: mockWalletData.transactions.filter(tx => tx.userId === userId).length,
                    limit,
                    offset
                }
            }
        });

    } catch (error) {
        console.error('Failed to get wallet data:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch wallet data'
            },
            { status: 500 }
        );
    }
}

// Create new transaction (recharge, payment, etc.)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            userId = 'user-1',
            type,
            amount,
            description,
            paymentMethod,
            serviceType
        } = body;

        if (!type || !amount || !description) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: type, amount, description'
                },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Amount must be greater than 0'
                },
                { status: 400 }
            );
        }

        // Create new transaction
        const newTransaction: WalletTransaction = {
            id: `tx-${Date.now()}`,
            userId,
            type,
            amount,
            description,
            status: type === 'credit' ? 'pending' : 'completed',
            date: new Date().toISOString(),
            reference: `REF-${Date.now()}`,
            metadata: {
                paymentMethod,
                serviceType
            }
        };

        // Add to mock data (in real app, save to database)
        mockWalletData.transactions.unshift(newTransaction);

        // Update balance if transaction is completed
        if (newTransaction.status === 'completed') {
            if (type === 'credit') {
                mockWalletData.balance.balance += amount;
                mockWalletData.balance.totalCredits += amount;
            } else {
                mockWalletData.balance.balance -= amount;
                mockWalletData.balance.totalDebits += amount;
            }
            mockWalletData.balance.lastUpdated = new Date().toISOString();
        }

        return NextResponse.json({
            success: true,
            data: {
                transaction: newTransaction,
                newBalance: mockWalletData.balance.balance
            },
            message: type === 'credit' ? '充值申请已提交' : '扣款成功'
        });

    } catch (error) {
        console.error('Failed to create transaction:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create transaction'
            },
            { status: 500 }
        );
    }
}

// Update transaction status (e.g., mark recharge as completed)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { transactionId, status } = body;

        if (!transactionId || !status) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: transactionId, status'
                },
                { status: 400 }
            );
        }

        const transaction = mockWalletData.transactions.find(tx => tx.id === transactionId);
        if (!transaction) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Transaction not found'
                },
                { status: 404 }
            );
        }

        // Update transaction status
        const oldStatus = transaction.status;
        transaction.status = status;

        // If status changed from pending to completed for credit transaction, update balance
        if (oldStatus === 'pending' && status === 'completed' && transaction.type === 'credit') {
            mockWalletData.balance.balance += transaction.amount;
            mockWalletData.balance.totalCredits += transaction.amount;
            mockWalletData.balance.lastUpdated = new Date().toISOString();
        }

        return NextResponse.json({
            success: true,
            data: {
                transaction,
                newBalance: mockWalletData.balance.balance
            },
            message: 'Transaction status updated successfully'
        });

    } catch (error) {
        console.error('Failed to update transaction:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to update transaction'
            },
            { status: 500 }
        );
    }
}
