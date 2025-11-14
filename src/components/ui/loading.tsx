'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
    fullscreen?: boolean;
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
};

export function Loading({
    size = 'md',
    text,
    className,
    fullscreen = false
}: LoadingProps) {
    const content = (
        <div className={cn(
            "flex items-center justify-center gap-2",
            fullscreen && "min-h-screen",
            className
        )}>
            <Loader2 className={cn("animate-spin", sizeClasses[size])} />
            {text && (
                <span className="text-muted-foreground text-sm">{text}</span>
            )}
        </div>
    );

    return content;
}

// Loading overlay for components
export function LoadingOverlay({
    children,
    loading,
    text = "Loading..."
}: {
    children: React.ReactNode;
    loading: boolean;
    text?: string;
}) {
    return (
        <div className="relative">
            {children}
            {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <Loading text={text} />
                </div>
            )}
        </div>
    );
}

// Skeleton loader
export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    );
}

// Card skeleton for consistent loading states
export function CardSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[60%]" />
        </div>
    );
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}