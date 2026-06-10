/**
 * src/lib/gemini.client.ts
 * Google Gemini 2.5 API client for AI content generation.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!env.geminiEnabled) {
    throw ApiError.serviceUnavailable(
      'Gemini AI is not configured. Set GEMINI_API_KEY in .env',
    );
  }
  if (!client) {
    client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return client;
}

export interface GenerateTextOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export const geminiClient = {
  isEnabled(): boolean {
    return env.geminiEnabled;
  },

  async generateText(prompt: string, options?: GenerateTextOptions): Promise<string> {
    if (!env.geminiEnabled) {
      return `[Demo mode] Generated content for: ${prompt.slice(0, 100)}...`;
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: options?.systemPrompt,
      generationConfig: {
        temperature: options?.temperature ?? 0.8,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw ApiError.internal('Gemini returned an empty response.');
    }

    return text.trim();
  },

  async generateJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const text = await this.generateText(
      `${prompt}\n\nRespond with valid JSON only, no markdown fences.`,
      { systemPrompt, temperature: 0.5 },
    );

    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw ApiError.internal('Failed to parse Gemini JSON response.');
    }
  },

  async generateImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
    if (!env.geminiEnabled) {
      throw ApiError.serviceUnavailable(
        'Image generation requires GEMINI_API_KEY. Configure Gemini to enable AI creatives.',
      );
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        // @ts-expect-error responseModalities is supported by image-capable models
        responseModalities: ['Text', 'Image'],
      },
    });

    const result = await model.generateContent(prompt);
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? 'image/png',
        };
      }
    }

    throw ApiError.internal('Gemini did not return an image. Try a different prompt.');
  },
};
