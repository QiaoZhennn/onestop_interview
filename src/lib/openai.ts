import OpenAI from 'openai';

export function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });
}

export const AI_MODEL = 'gpt-4.1-mini';
