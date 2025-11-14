'use server';

/**
 * @fileOverview Automatically responds to user messages with a relevant answer based on the configured AI agent for the channel.
 *
 * - autoReplyUserMessage - A function that handles the automatic reply process.
 * - AutoReplyUserMessageInput - The input type for the autoReplyUserMessage function.
 * - AutoReplyUserMessageOutput - The return type for the autoReplyUserMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutoReplyUserMessageInputSchema = z.object({
  userMessage: z.string().describe('The message content from the user.'),
  channel: z.string().describe('The channel the message originated from (e.g., WhatsApp, Telegram).'),
  agentPrompt: z.string().optional().describe('The prompt for the AI agent configured for this channel.'),
  systemPrompt: z.string().optional().describe('System prompt to guide AI behavior.'),
});
export type AutoReplyUserMessageInput = z.infer<typeof AutoReplyUserMessageInputSchema>;

const AutoReplyUserMessageOutputSchema = z.object({
  autoReply: z.string().describe('The AI-generated reply to the user message.'),
});
export type AutoReplyUserMessageOutput = z.infer<typeof AutoReplyUserMessageOutputSchema>;

export async function autoReplyUserMessage(input: AutoReplyUserMessageInput): Promise<AutoReplyUserMessageOutput> {
  return autoReplyUserMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoReplyUserMessagePrompt',
  input: {schema: AutoReplyUserMessageInputSchema},
  output: {schema: AutoReplyUserMessageOutputSchema},
  prompt: `{{systemPrompt}}\nUser message from {{channel}}: {{{userMessage}}}\nAI Agent Prompt: {{agentPrompt}}\n\nAI Reply: `,
});

const autoReplyUserMessageFlow = ai.defineFlow(
  {
    name: 'autoReplyUserMessageFlow',
    inputSchema: AutoReplyUserMessageInputSchema,
    outputSchema: AutoReplyUserMessageOutputSchema,
  },
  async input => {
    const {
      userMessage,
      channel,
      agentPrompt,
      systemPrompt,
    } = input;

    const {output} = await prompt({
      userMessage,
      channel,
      agentPrompt,
      systemPrompt,
    });

    return {
      autoReply: output!.autoReply,
    };
  }
);
