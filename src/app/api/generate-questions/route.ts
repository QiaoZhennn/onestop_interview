import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, AI_MODEL } from '@/lib/openai';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userProfile, roleProfile, sessionId } = await request.json();

    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert technical interviewer. Generate interview questions based on the candidate's profile and the target role.

The questions should:
1. Test the candidate's understanding of the role's key responsibilities
2. Assess their technical skills relevant to the position
3. Include behavioral/situational questions
4. Range from fundamental to advanced difficulty
5. Be specific and relevant to the industry and role

Generate between 5 and 10 questions. Return a JSON object with a single field:
- questions: string[] (array of interview questions)

Return ONLY valid JSON, no markdown formatting.`,
        },
        {
          role: 'user',
          content: `Candidate Profile:
- Name: ${userProfile.name}
- Years of Experience: ${userProfile.years_of_experience}
- Current Role: ${userProfile.current_role}
- Industry: ${userProfile.industry}
- Skills: ${userProfile.skills.join(', ')}
- Education: ${userProfile.education}

Target Role:
- Title: ${roleProfile.title}
- Company: ${roleProfile.company}
- Level: ${roleProfile.level}
- Department: ${roleProfile.department}
- Key Responsibilities: ${roleProfile.key_responsibilities.join('; ')}
- Required Skills: ${roleProfile.required_skills.join(', ')}
- Summary: ${roleProfile.summary}

Generate interview questions that would help assess if this candidate is a good fit for this role.`,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(cleaned);

    // Store questions in database
    const supabase = createServiceClient();
    for (let i = 0; i < data.questions.length; i++) {
      await supabase.from('interview_qas').insert({
        session_id: sessionId,
        question_number: i + 1,
        question_text: data.questions[i],
      });
    }

    return NextResponse.json({ questions: data.questions });
  } catch (error: unknown) {
    console.error('Generate questions error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate questions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
