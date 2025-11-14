import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-conversation.ts';
import '@/ai/flows/generate-agent-prompt.ts';
import '@/ai/flows/auto-reply-user-message.ts';