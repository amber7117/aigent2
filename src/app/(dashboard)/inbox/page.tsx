
import { MessageCircle } from 'lucide-react';

export default function InboxPage() {
  return (
    <div className="hidden h-full flex-col items-center justify-center lg:flex">
      <MessageCircle className="h-24 w-24 text-muted-foreground/50" />
      <div className="mt-6 text-center">
        <h1 className="text-2xl font-bold">欢迎来到您的收件箱</h1>
        <p className="mt-2 text-muted-foreground">
          从左侧列表中选择一个对话以开始。
        </p>
      </div>
    </div>
  );
}
