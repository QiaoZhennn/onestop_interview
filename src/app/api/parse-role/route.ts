import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, AI_MODEL } from '@/lib/openai';

const ROLE_SYSTEM_PROMPT = `You are an expert job description analyzer. Analyze the given job description and extract a structured role profile. Return a JSON object with these fields:
- title: string (job title)
- company: string (company name, or "Unknown" if not found)
- level: string (e.g., "Junior", "Mid-Level", "Senior", "Lead", "Manager", "Director")
- department: string (e.g., "Engineering", "Product", "Marketing")
- key_responsibilities: string[] (list of main responsibilities, max 6)
- required_skills: string[] (list of required skills, max 8)
- preferred_qualifications: string[] (list of preferred/nice-to-have qualifications, max 5)
- summary: string (2-3 sentence summary of the role)

Return ONLY valid JSON, no markdown formatting.`;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let roleText = '';
    let inputType: 'url' | 'text' | 'screenshot' = 'text';

    if (contentType.includes('multipart/form-data')) {
      // Screenshot upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      inputType = 'screenshot';

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Convert image to base64 for GPT-4 vision
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'image/png';

      const openai = getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: ROLE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this job description screenshot and extract the role profile:' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '';
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const role = JSON.parse(cleaned);
      return NextResponse.json({ role, inputType });

    } else {
      // JSON body (text or URL)
      const body = await request.json();
      inputType = body.type;

      if (body.type === 'url') {
        // Fetch URL content
        try {
          const res = await fetch(body.input, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          roleText = await res.text();
          // Strip HTML tags for cleaner text
          roleText = roleText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          roleText = roleText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          roleText = roleText.replace(/<[^>]+>/g, ' ');
          roleText = roleText.replace(/\s+/g, ' ').trim();
          // Truncate to avoid token limits
          roleText = roleText.substring(0, 8000);
        } catch {
          return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 });
        }
      } else {
        roleText = body.input;
      }
    }

    if (!roleText.trim()) {
      return NextResponse.json({ error: 'No content to analyze' }, { status: 400 });
    }

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: ROLE_SYSTEM_PROMPT },
        { role: 'user', content: roleText },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const role = JSON.parse(cleaned);

    return NextResponse.json({ role, inputType });
  } catch (error: unknown) {
    console.error('Role parse error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
