import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, AI_MODEL } from '@/lib/openai';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userProfile, roleProfile, answers } = await request.json();

    const openai = getOpenAIClient();

    const qaText = answers.map((qa: { question_number: number; question_text: string; answer_text: string; score: number; evaluation: string }) =>
      `Q${qa.question_number}: ${qa.question_text}\nA: ${qa.answer_text}\nScore: ${qa.score}/100\nFeedback: ${qa.evaluation}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert interview evaluator providing an overall assessment of a candidate's interview performance.

Provide a comprehensive evaluation considering:
1. Overall technical competency
2. Communication skills
3. Problem-solving ability
4. Cultural fit and soft skills
5. Likelihood of succeeding in the role

Return a JSON object with:
- score: number (0-100, overall interview score)
- evaluation: string (comprehensive 4-6 sentence evaluation covering strengths, weaknesses, and overall assessment of the candidate's fit for the role)

Return ONLY valid JSON, no markdown formatting.`,
        },
        {
          role: 'user',
          content: `Candidate: ${userProfile.name}
- ${userProfile.years_of_experience} years of experience
- Current role: ${userProfile.current_role}
- Industry: ${userProfile.industry}
- Skills: ${userProfile.skills.join(', ')}

Target Role: ${roleProfile.title} at ${roleProfile.company} (${roleProfile.level})
- Required Skills: ${roleProfile.required_skills.join(', ')}
- Key Responsibilities: ${roleProfile.key_responsibilities.join('; ')}

Interview Q&A:
${qaText}

Provide an overall evaluation of this candidate's interview performance.`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const evaluation = JSON.parse(cleaned);

    // Update session in database
    const supabase = createServiceClient();
    await supabase
      .from('interview_sessions')
      .update({
        status: 'completed',
        overall_score: evaluation.score,
        overall_evaluation: evaluation.evaluation,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({
      score: evaluation.score,
      evaluation: evaluation.evaluation,
    });
  } catch (error: unknown) {
    console.error('Overall evaluation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate overall evaluation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
