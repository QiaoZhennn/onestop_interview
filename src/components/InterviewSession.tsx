'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Mic, MicOff, Send, ChevronRight, Award } from 'lucide-react';
import { ProfileSummary, RoleSummary, InterviewQA } from '@/types';

interface InterviewSessionProps {
  userProfile: ProfileSummary;
  roleProfile: RoleSummary;
  sessionId: string;
  onComplete: (score: number, evaluation: string) => void;
}

export default function InterviewSession({ userProfile, roleProfile, sessionId, onComplete }: InterviewSessionProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<InterviewQA[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [overallEvaluation, setOverallEvaluation] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentQ, answers, loading]);

  // Generate questions on mount
  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, roleProfile, sessionId }),
      });
      if (!res.ok) throw new Error('Failed to generate questions');
      const data = await res.json();
      setQuestions(data.questions);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate questions';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transcribe',
          audioBase64: await blobToBase64(blob),
        }),
      });

      if (!res.ok) throw new Error('Failed to transcribe');
      const data = await res.json();
      setCurrentAnswer(data.text);
    } catch {
      setError('Failed to transcribe audio');
    } finally {
      setLoading(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    setEvaluating(true);
    setError('');

    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          sessionId,
          questionNumber: currentQ + 1,
          question: questions[currentQ],
          answer: currentAnswer,
          userProfile,
          roleProfile,
          answerType: recording ? 'voice' : 'text',
        }),
      });

      if (!res.ok) throw new Error('Failed to evaluate answer');
      const data = await res.json();

      const newQA: InterviewQA = {
        id: data.id,
        session_id: sessionId,
        question_number: currentQ + 1,
        question_text: questions[currentQ],
        answer_text: currentAnswer,
        answer_type: 'text',
        score: data.score,
        evaluation: data.evaluation,
        created_at: new Date().toISOString(),
      };

      setAnswers([...answers, newQA]);
      setCurrentAnswer('');

      if (currentQ + 1 >= questions.length) {
        // All questions answered, get overall evaluation
        await getOverallEvaluation([...answers, newQA]);
      } else {
        setCurrentQ(currentQ + 1);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate answer';
      setError(errorMessage);
    } finally {
      setEvaluating(false);
    }
  };

  const getOverallEvaluation = async (allAnswers: InterviewQA[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/evaluate-overall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userProfile,
          roleProfile,
          answers: allAnswers,
        }),
      });

      if (!res.ok) throw new Error('Failed to get overall evaluation');
      const data = await res.json();

      setOverallScore(data.score);
      setOverallEvaluation(data.evaluation);
      setCompleted(true);
      onComplete(data.score, data.evaluation);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get overall evaluation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="text-coder-brown animate-spin mb-4" size={32} />
        <p className="text-sm text-coder-text-dim">
          <span className="text-coder-brown">$</span> generating interview questions<span className="cursor-blink">_</span>
        </p>
      </div>
    );
  }

  if (completed && overallScore !== null) {
    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
            <span className="text-xs text-coder-text-dim">
              <Award size={12} className="inline mr-1" />
              evaluation_result.json
            </span>
          </div>
          <div className="p-6 text-center">
            <div className={`text-5xl font-bold mb-2 ${
              overallScore >= 80 ? 'text-coder-success' :
              overallScore >= 60 ? 'text-coder-warning' : 'text-coder-error'
            }`}>
              {overallScore}
              <span className="text-lg text-coder-text-dim">/100</span>
            </div>
            <div className="w-full bg-coder-bg rounded-full h-2 mt-4 mb-4">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${
                  overallScore >= 80 ? 'bg-coder-success' :
                  overallScore >= 60 ? 'bg-coder-warning' : 'bg-coder-error'
                }`}
                style={{ width: `${overallScore}%` }}
              />
            </div>
            <p className="text-sm text-coder-text leading-relaxed text-left">{overallEvaluation}</p>
          </div>
        </div>

        {/* Individual Q&A Results */}
        <div className="space-y-3">
          <h4 className="text-xs text-coder-text-dim">{"// Question-by-question breakdown"}</h4>
          {answers.map((qa, i) => (
            <div key={i} className="bg-coder-card border border-coder-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-coder-brown flex-1">
                  <span className="text-coder-grey-dark">Q{qa.question_number}:</span> {qa.question_text}
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                  (qa.score || 0) >= 80 ? 'bg-coder-success/20 text-coder-success' :
                  (qa.score || 0) >= 60 ? 'bg-coder-warning/20 text-coder-warning' : 'bg-coder-error/20 text-coder-error'
                }`}>
                  {qa.score}/100
                </span>
              </div>
              <p className="text-xs text-coder-text">
                <span className="text-coder-grey-dark">A:</span> {qa.answer_text}
              </p>
              <p className="text-xs text-coder-text-dim italic">{qa.evaluation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-coder-text-dim">progress:</span>
        <div className="flex-1 bg-coder-bg rounded-full h-1.5">
          <div
            className="bg-coder-brown h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${((currentQ) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-coder-brown">{currentQ + 1}/{questions.length}</span>
      </div>

      {/* Previous Q&As */}
      {answers.map((qa, i) => (
        <div key={i} className="bg-coder-card/50 border border-coder-border/50 rounded-lg p-3 space-y-2 opacity-70">
          <p className="text-xs text-coder-brown">
            <span className="text-coder-grey-dark">Q{qa.question_number}:</span> {qa.question_text}
          </p>
          <p className="text-xs text-coder-text">
            <span className="text-coder-grey-dark">A:</span> {qa.answer_text}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              (qa.score || 0) >= 80 ? 'bg-coder-success/20 text-coder-success' :
              (qa.score || 0) >= 60 ? 'bg-coder-warning/20 text-coder-warning' : 'bg-coder-error/20 text-coder-error'
            }`}>
              {qa.score}/100
            </span>
            <span className="text-xs text-coder-text-dim">{qa.evaluation}</span>
          </div>
        </div>
      ))}

      {/* Current question */}
      {questions.length > 0 && currentQ < questions.length && (
        <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-coder-border bg-coder-surface flex items-center justify-between">
            <span className="text-xs text-coder-text-dim">question_{currentQ + 1}.txt</span>
            <span className="text-xs text-coder-brown">{currentQ + 1} of {questions.length}</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-coder-text leading-relaxed mb-4">
              <span className="text-coder-brown mr-2">&gt;</span>
              {questions[currentQ]}
            </p>

            {/* Answer input */}
            <div className="space-y-3">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full bg-coder-bg border border-coder-border rounded px-3 py-2 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors min-h-[100px] resize-y"
                disabled={evaluating || loading}
              />

              <div className="flex items-center gap-2">
                {/* Voice recording button */}
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={evaluating || loading}
                  className={`flex items-center gap-1 px-3 py-2 rounded text-xs border transition-colors ${
                    recording
                      ? 'bg-coder-error/20 border-coder-error/40 text-coder-error pulse-record'
                      : 'bg-coder-surface border-coder-border text-coder-text-dim hover:text-coder-text hover:border-coder-brown/50'
                  }`}
                >
                  {recording ? <MicOff size={14} /> : <Mic size={14} />}
                  {recording ? 'stop' : 'voice'}
                </button>

                {/* Submit button */}
                <button
                  onClick={submitAnswer}
                  disabled={!currentAnswer.trim() || evaluating || loading}
                  className="flex-1 bg-coder-brown/20 border border-coder-brown/40 text-coder-brown hover:bg-coder-brown/30 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {evaluating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>evaluating<span className="cursor-blink">_</span></span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>submit</span>
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-coder-error text-xs bg-coder-error/10 border border-coder-error/20 rounded px-3 py-2">
          <span className="text-coder-error/60">error:</span> {error}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
