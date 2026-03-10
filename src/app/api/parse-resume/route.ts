import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, AI_MODEL } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let resumeText = '';
    let imageBase64 = '';

    if (contentType.includes('multipart/form-data')) {
      // Screenshot upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString('base64');
      const mimeType = file.type || 'image/png';
      imageBase64 = `data:${mimeType};base64,${imageBase64}`;
    } else {
      // Text description
      const body = await request.json();
      resumeText = body.text || '';
      if (!resumeText.trim()) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }
    }

    const openai = getOpenAIClient();

    const systemPrompt = `You are an expert resume analyzer. Analyze the given resume (either as text or an image) and extract a structured profile. Return a JSON object with these fields:
- name: string (candidate's full name, use "Unknown" if not found)
- years_of_experience: number (estimated total years of professional experience)
- current_role: string (most recent job title)
- industry: string (primary industry)
- skills: string[] (list of key technical and soft skills, max 10)
- education: string (highest education level and field)
- summary: string (2-3 sentence professional summary)

Return ONLY valid JSON, no markdown formatting.`;

    type ChatMessage = {
      role: 'system' | 'user';
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Please analyze this resume screenshot and extract the profile information.' },
          { type: 'image_url', image_url: { url: imageBase64 } },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: resumeText,
      });
    }

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: messages as Parameters<typeof openai.chat.completions.create>[0]['messages'],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const profile = JSON.parse(cleaned);

    return NextResponse.json({ profile, resumeText: resumeText || '[Extracted from screenshot]' });
  } catch (error: unknown) {
    console.error('Resume parse error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
