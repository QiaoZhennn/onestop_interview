import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, AI_MODEL } from '@/lib/openai';
import pdf from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let resumeText = '';

    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdf(buffer);
      resumeText = pdfData.text;
    } else {
      // For text files, read directly
      resumeText = await file.text();
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert resume analyzer. Analyze the given resume and extract a structured profile. Return a JSON object with these fields:
- name: string (candidate's full name)
- years_of_experience: number (estimated total years of professional experience)
- current_role: string (most recent job title)
- industry: string (primary industry)
- skills: string[] (list of key technical and soft skills, max 10)
- education: string (highest education level and field)
- summary: string (2-3 sentence professional summary)

Return ONLY valid JSON, no markdown formatting.`,
        },
        {
          role: 'user',
          content: resumeText,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const profile = JSON.parse(cleaned);

    return NextResponse.json({ profile, resumeText });
  } catch (error: unknown) {
    console.error('Resume parse error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
