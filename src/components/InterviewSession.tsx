'use client';

import { useState, useEffect, useRef } from 'react';
import { ProfileSummary, RoleSummary } from '@/types';
import { Loader2, Mic, MicOff, Send, Award, ChevronRight } from 'lucide-react';

interface InterviewSessionProps {
  userProfile: ProfileSummary;
  roleProfile: RoleSummary;
  sessionId: string;
  onComplete: () => void;
}

interface QA {
  question: string;
  answer: string;
  evaluation?: string;
  score?: number;
}

export default function InterviewSession({ userProfile, roleProfile, sessionId, onComplete }: InterviewSessionProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [overallEvaluation, setOverallEvaluation] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, roleProfile }),
      });
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to generate questions:', err);
    } finally {
      setLoading(false);
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

        setTranscribing(true);

        try {
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Transcription failed');
          }

          const data = await res.json();
          if (data.text) {
            setAnswer(prev => prev ? prev + ' ' + data.text : data.text);
          }
        } catch (err) {
          console.error('Transcription failed:', err);
          const errMsg = err instanceof Error ? err.message : 'Transcription failed';
          setAnswer(prev => prev + ` [Voice error: ${errMsg}]`);
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);

    try {
      // Evaluate this answer
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionNumber: currentIndex + 1,
          question: questions[currentIndex],
          answer: answer.trim(),
          userProfile,
          roleProfile,
        }),
      });
      const data = await res.json();

      const qa: QA = {
        question: questions[currentIndex],
        answer: answer.trim(),
        evaluation: data.evaluation,
        score: data.score,
      };

      const newAnswers = [...answers, qa];
      setAnswers(newAnswers);
      setAnswer('');

      if (currentIndex + 1 >= questions.length) {
        // All questions answered, get overall evaluation
        const overallRes = await fetch('/api/evaluate-overall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            qas: newAnswers,
            userProfile,
            roleProfile,
          }),
        });
        const overallData = await overallRes.json();
        setOverallScore(overallData.score);
        setOverallEvaluation(overallData.evaluation);
        setCompleted(true);
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="text-coder-brown animate-spin" size={32} />
        <p className="text-sm text-coder-text-dim">Generating interview questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-coder-text-dim text-sm">Failed to generate questions. Please try again.</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
            <span className="text-xs text-coder-text-dim flex items-center gap-1">
              <Award size={12} />
              Interview Results
            </span>
          </div>
          <div className="p-6 text-center">
            <div className={`text-5xl font-bold mb-2 ${
              (overallScore || 0) >= 80 ? 'text-coder-success' :
              (overallScore || 0) >= 60 ? 'text-coder-warning' : 'text-coder-error'
            }`}>
              {overallScore}
              <span className="text-lg text-coder-text-dim">/100</span>
            </div>
            <div className="w-full bg-coder-bg rounded-full h-2 mt-4 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${
                  (overallScore || 0) >= 80 ? 'bg-coder-success' :
                  (overallScore || 0) >= 60 ? 'bg-coder-warning' : 'bg-coder-error'
                }`}
                style={{ width: `${overallScore || 0}%` }}
              />
            </div>
            <p className="text-sm text-coder-text leading-relaxed text-left">{overallEvaluation}</p>
          </div>
        </div>

        {/* Individual Q&A Results */}
        <div className="space-y-3">
          <h4 className="text-xs text-coder-text-dim font-medium">Question-by-Question Breakdown</h4>
          {answers.map((qa, i) => (
            <div key={i} className="bg-coder-card border border-coder-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-coder-brown flex-1">
                  <span className="text-coder-grey-dark font-medium">Q{i + 1}:</span> {qa.question}
                </p>
                {qa.score !== undefined && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                    qa.score >= 80 ? 'bg-coder-success/20 text-coder-success' :
                    qa.score >= 60 ? 'bg-coder-warning/20 text-coder-warning' : 'bg-coder-error/20 text-coder-error'
                  }`}>
                    {qa.score}/100
                  </span>
                )}
              </div>
              {qa.answer && (
                <p className="text-xs text-coder-text">
                  <span className="text-coder-grey-dark font-medium">A:</span> {qa.answer}
                </p>
              )}
              {qa.evaluation && (
                <p className="text-xs text-coder-text-dim italic">{qa.evaluation}</p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="w-full bg-coder-brown/20 border border-coder-brown/40 text-coder-brown hover:bg-coder-brown/30 rounded px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          Back to Dashboard
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-coder-text-dim">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span>{Math.round(((currentIndex) / questions.length) * 100)}% complete</span>
      </div>
      <div className="w-full bg-coder-bg rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-coder-brown transition-all"
          style={{ width: `${(currentIndex / questions.length) * 100}%` }}
        />
      </div>

      {/* Current Question */}
      <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
          <span className="text-xs text-coder-text-dim">
            Question {currentIndex + 1}
          </span>
        </div>
        <div className="p-4">
          <p className="text-sm text-coder-text leading-relaxed">{questions[currentIndex]}</p>
        </div>
      </div>

      {/* Answer Input */}
      <div className="space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full bg-coder-bg border border-coder-border rounded-lg px-4 py-3 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors min-h-[120px] resize-y"
          disabled={submitting}
        />

        <div className="flex gap-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={submitting || transcribing}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors ${
              recording
                ? 'bg-coder-error/20 border border-coder-error/40 text-coder-error hover:bg-coder-error/30'
                : 'bg-coder-surface border border-coder-border text-coder-text-dim hover:text-coder-text hover:border-coder-brown/40'
            }`}
          >
            {transcribing ? <Loader2 size={14} className="animate-spin" /> : recording ? <MicOff size={14} /> : <Mic size={14} />}
            {transcribing ? 'Transcribing...' : recording ? 'Stop Recording' : 'Voice Input'}
          </button>

          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || submitting}
            className="flex-1 bg-coder-brown/20 border border-coder-brown/40 text-coder-brown hover:bg-coder-brown/30 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Previous Answers */}
      {answers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-coder-text-dim font-medium">Previous Answers</h4>
          {answers.map((qa, i) => (
            <div key={i} className="bg-coder-card border border-coder-border rounded-lg p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-coder-brown flex-1">
                  <span className="font-medium">Q{i + 1}:</span> {qa.question}
                </p>
                {qa.score !== undefined && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    qa.score >= 80 ? 'bg-coder-success/20 text-coder-success' :
                    qa.score >= 60 ? 'bg-coder-warning/20 text-coder-warning' : 'bg-coder-error/20 text-coder-error'
                  }`}>
                    {qa.score}
                  </span>
                )}
              </div>
              <p className="text-xs text-coder-text-dim truncate">{qa.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
