'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import InterviewSession from '@/components/InterviewSession';
import { ProfileSummary, RoleSummary, InterviewQA } from '@/types';
import { Loader2, ArrowLeft, Award } from 'lucide-react';

function InterviewContent() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<ProfileSummary | null>(null);
  const [roleProfile, setRoleProfile] = useState<RoleSummary | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReview, setIsReview] = useState(false);
  const [reviewData, setReviewData] = useState<{
    score: number;
    evaluation: string;
    qas: InterviewQA[];
  } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const sid = searchParams.get('session');
      const review = searchParams.get('review') === 'true';

      if (!sid) {
        router.push('/dashboard');
        return;
      }

      setSessionId(sid);
      setIsReview(review);

      // Get session details
      const { data: session } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', sid)
        .single();

      if (!session) {
        router.push('/dashboard');
        return;
      }

      // Get role profile
      const { data: role } = await supabase
        .from('role_profiles')
        .select('*')
        .eq('id', session.role_profile_id)
        .single();

      if (role?.role_summary) {
        setRoleProfile(role.role_summary as unknown as RoleSummary);
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile?.profile_summary) {
        setUserProfile(profile.profile_summary as unknown as ProfileSummary);
      }

      // If review mode, load Q&As
      if (review && session.status === 'completed') {
        const { data: qas } = await supabase
          .from('interview_qas')
          .select('*')
          .eq('session_id', sid)
          .order('question_number', { ascending: true });

        setReviewData({
          score: session.overall_score,
          evaluation: session.overall_evaluation,
          qas: (qas || []) as InterviewQA[],
        });
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleComplete = () => {
    router.push(`/interview?session=${sessionId}&review=true`);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-coder-brown animate-spin" size={32} />
      </div>
    );
  }

  if (isReview && reviewData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <a href="/dashboard" className="inline-flex items-center gap-1 text-sm text-coder-text-dim hover:text-coder-brown transition-colors mb-6">
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </a>

        <h1 className="text-xl font-bold text-coder-text mb-6">
          Interview Results
        </h1>

        {/* Overall Score */}
        <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
            <span className="text-xs text-coder-text-dim flex items-center gap-1">
              <Award size={12} />
              Evaluation Result
            </span>
          </div>
          <div className="p-6 text-center">
            <div className={`text-5xl font-bold mb-2 ${
              reviewData.score >= 80 ? 'text-coder-success' :
              reviewData.score >= 60 ? 'text-coder-warning' : 'text-coder-error'
            }`}>
              {reviewData.score}
              <span className="text-lg text-coder-text-dim">/100</span>
            </div>
            <div className="w-full bg-coder-bg rounded-full h-2 mt-4 mb-4">
              <div
                className={`h-2 rounded-full ${
                  reviewData.score >= 80 ? 'bg-coder-success' :
                  reviewData.score >= 60 ? 'bg-coder-warning' : 'bg-coder-error'
                }`}
                style={{ width: `${reviewData.score}%` }}
              />
            </div>
            <p className="text-sm text-coder-text leading-relaxed text-left">{reviewData.evaluation}</p>
          </div>
        </div>

        {/* Q&A Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs text-coder-text-dim font-medium">Question-by-Question Breakdown</h4>
          {reviewData.qas.map((qa, i) => (
            <div key={i} className="bg-coder-card border border-coder-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-coder-brown flex-1">
                  <span className="text-coder-grey-dark font-medium">Q{qa.question_number}:</span> {qa.question_text}
                </p>
                {qa.score !== null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                    qa.score >= 80 ? 'bg-coder-success/20 text-coder-success' :
                    qa.score >= 60 ? 'bg-coder-warning/20 text-coder-warning' : 'bg-coder-error/20 text-coder-error'
                  }`}>
                    {qa.score}/100
                  </span>
                )}
              </div>
              {qa.answer_text && (
                <p className="text-xs text-coder-text">
                  <span className="text-coder-grey-dark font-medium">A:</span> {qa.answer_text}
                </p>
              )}
              {qa.evaluation && (
                <p className="text-xs text-coder-text-dim italic">{qa.evaluation}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!userProfile || !roleProfile || !sessionId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-coder-text-dim">Missing data. Please go back to dashboard.</p>
        <a href="/dashboard" className="text-coder-brown hover:text-coder-brown-light mt-4 inline-block">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <a href="/dashboard" className="inline-flex items-center gap-1 text-sm text-coder-text-dim hover:text-coder-brown transition-colors mb-6">
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </a>

      <h1 className="text-xl font-bold text-coder-text mb-2">
        Interview Session
      </h1>
      <p className="text-sm text-coder-text-dim mb-6">
        {roleProfile.title} at {roleProfile.company}
      </p>

      <InterviewSession
        userProfile={userProfile}
        roleProfile={roleProfile}
        sessionId={sessionId}
        onComplete={handleComplete}
      />
    </div>
  );
}

export default function InterviewPage() {
  return (
    <div className="min-h-screen bg-coder-bg">
      <Navbar />
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-coder-brown animate-spin" size={32} />
        </div>
      }>
        <InterviewContent />
      </Suspense>
    </div>
  );
}
