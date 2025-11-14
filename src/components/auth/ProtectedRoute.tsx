'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAdmin = false
}) => {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
                return;
            }

            if (requireAdmin && userProfile?.role !== 'admin') {
                router.push('/inbox'); // Redirect non-admins to dashboard
                return;
            }
        }
    }, [user, userProfile, loading, requireAdmin, router]);

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="flex h-screen">
                    {/* Sidebar skeleton */}
                    <div className="w-64 border-r bg-white">
                        <div className="flex h-16 items-center border-b px-6">
                            <div className="flex items-center gap-2">
                                <Bot className="h-6 w-6 text-primary" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main content skeleton */}
                    <div className="flex-1 p-6">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-8 w-48" />
                                <Skeleton className="h-10 w-32" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="p-6 border rounded-lg bg-white">
                                        <Skeleton className="h-4 w-24 mb-4" />
                                        <Skeleton className="h-8 w-16 mb-2" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                ))}
                            </div>

                            <div className="border rounded-lg bg-white p-6">
                                <Skeleton className="h-6 w-32 mb-4" />
                                <Skeleton className="h-64 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // If not authenticated, don't render anything (redirect will happen)
    if (!user || !userProfile) {
        return null;
    }

    // If admin required and user is not admin, don't render anything (redirect will happen)
    if (requireAdmin && userProfile.role !== 'admin') {
        return null;
    }

    return <>{children}</>;
};