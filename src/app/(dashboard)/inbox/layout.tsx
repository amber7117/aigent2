'use client';
import ConversationList from "@/components/dashboard/conversation-list";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isConversationSelected = pathname.includes('/inbox/') && pathname !== '/inbox';
  const isMobile = useMobile();

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[380px_1fr]">
      <div
        className={cn(
          "border-r bg-card",
          isMobile && isConversationSelected ? "hidden" : "block",
          "lg:block"
        )}
      >
        <ConversationList />
      </div>
      <div
        className={cn(
          "flex-col",
          isMobile && !isConversationSelected ? "hidden" : "flex",
          "lg:flex"
        )}
      >
        {children}
      </div>
    </div>
  );
}
