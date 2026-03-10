import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, AI_MODEL } from '@/lib/openai';
import { createServiceClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const openai = getOpenAIClient();

    // Handle transcription
    if (body.action === 'transcribe') {
      const audioBuffer = Buffer.from(body.audioBase64, 'base64');
      const audioFile = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });

      return NextResponse.json({ text: transcription.text });
    }

    // Handle evaluation
    const { sessionId, questionNumber, question, answer, userProfile, roleProfile, answerType } = body;

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert interview evaluator. Evaluate the candidate's answer to the interview question.

Consider:
1. Relevance and accuracy of the answer
2. Depth of knowledge demonstrated
3. Communication clarity
4. Practical experience shown
5. How well it aligns with the role requirements

Return a JSON object with:
- score: number (0-100, where 100 is perfect)
- evaluation: string (2-3 sentence evaluation explaining the score)

Return ONLY valid JSON, no markdown formatting.`,
        },
        {
          role: 'user',
          content: `Role: ${roleProfile.title} at ${roleProfile.company} (${roleProfile.level})
Required Skills: ${roleProfile.required_skills.join(', ')}

Candidate: ${userProfile.name} (${userProfile.years_of_experience} YoE, ${userProfile.current_role})

Question: ${question}

Answer: ${answer}

Evaluate this answer.`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const evaluation = JSON.parse(cleaned);

    // Update the Q&A in database
    const supabase = createServiceClient();
    const { data: qaData } = await supabase
      .from('interview_qas')
      .update({
        answer_text: answer,
        answer_type: answerType || 'text',
        score: evaluation.score,
        evaluation: evaluation.evaluation,
      })
      .eq('session_id', sessionId)
      .eq('question_number', questionNumber)
      .select()
      .single();

    return NextResponse.json({
      id: qaData?.id,
      score: evaluation.score,
      evaluation: evaluation.evaluation,
    });
  } catch (error: unknown) {
    console.error('Evaluate answer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to evaluate answer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
