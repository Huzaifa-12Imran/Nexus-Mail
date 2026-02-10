import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

async function queryOpenRouter(model: string, messages: any[], maxTokens: number = 500): Promise<string> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 30000);

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://nexusmail.app",
      "X-Title": "Nexus-Mail",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.8,
      top_p: 0.9,
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  
  if (!content.trim()) {
    throw new Error("AI returned empty response");
  }
  
  return content;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawTranscript = body.transcript;
    
    if (!rawTranscript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ 
        transcript: rawTranscript, 
        emailDraft: "Error: No AI API key configured." 
      });
    }

    // Use a better model for email refinement
    let emailDraft = await queryOpenRouter("openai/gpt-4o-mini", [
      {
        role: "system",
        content: `You are an expert email writer. Transform rough voice notes into polished, professional emails.

CRITICAL RULES:
1. Do NOT just copy the input - IMPROVE it significantly
2. Add a proper Subject line
3. Add professional greeting (Hi/Hello/Dear) and closing (Best regards/Thanks/etc)
4. Fix grammar, spelling, and punctuation
5. Make fragmented sentences complete and coherent
6. Add necessary context to make the message complete
7. Keep the original intent but make it sound professional
8. Output the email ONLY ONCE - do not repeat any content

Output format:
Subject: [subject]

[body with greeting, main message, and closing]`
      },
      {
        role: "user",
        content: `Transform this voice memo into a professional email:\n\n"${rawTranscript}"`
      }
    ]);

    // Remove duplicate content if AI repeated itself
    const paragraphs = emailDraft.split('\n\n');
    const seen = new Set();
    const uniqueParagraphs: string[] = [];
    for (const p of paragraphs) {
      // Normalize: lowercase, trim, remove extra whitespace
      const normalized = p.trim().replace(/\s+/g, ' ').toLowerCase();
      // Also check just first 50 chars for very long repeated blocks
      const shortKey = normalized.substring(0, Math.min(50, normalized.length));
      if (normalized && !seen.has(shortKey) && normalized.length > 5) {
        seen.add(shortKey);
        uniqueParagraphs.push(p);
      }
    }
    emailDraft = uniqueParagraphs.join('\n\n');

    return NextResponse.json({
      transcript: rawTranscript,
      emailDraft: emailDraft
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
