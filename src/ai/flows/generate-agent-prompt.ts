'use server';

/**
 * @fileOverview AI agent prompt generator.
 *
 * - generateAgentPrompt - A function that generates a prompt for an AI agent.
 * - GenerateAgentPromptInput - The input type for the generateAgentPrompt function.
 * - GenerateAgentPromptOutput - The return type for the generateAgentPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAgentPromptInputSchema = z.object({
  agentDescription: z
    .string()
    .describe("A description of the agent's purpose and desired behavior."),
});
export type GenerateAgentPromptInput = z.infer<typeof GenerateAgentPromptInputSchema>;

const GenerateAgentPromptOutputSchema = z.object({
  agentPrompt: z.string().describe('The generated prompt for the AI agent.'),
});
export type GenerateAgentPromptOutput = z.infer<typeof GenerateAgentPromptOutputSchema>;

export async function generateAgentPrompt(input: GenerateAgentPromptInput): Promise<GenerateAgentPromptOutput> {
  return generateAgentPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAgentPromptPrompt',
  input: {schema: GenerateAgentPromptInputSchema},
  output: {schema: GenerateAgentPromptOutputSchema},
  prompt: `You are an AI prompt engineer. Your task is to generate a prompt for an AI agent based on the description provided by the user.

Description: {{{agentDescription}}}

Prompt:`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  }
});

const generateAgentPromptFlow = ai.defineFlow(
  {
    name: 'generateAgentPromptFlow',
    inputSchema: GenerateAgentPromptInputSchema,
    outputSchema: GenerateAgentPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
