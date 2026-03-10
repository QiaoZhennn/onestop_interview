'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ResumeUpload from '@/components/ResumeUpload';
import RoleInput from '@/components/RoleInput';
import { ProfileSummary, RoleSummary, InterviewSession } from '@/types';
import { Play, Clock, Award, ChevronRight, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileSummary | null>(null);
  const [roleProfile, setRoleProfile] = useState<RoleSummary | null>(null);
  const [roleProfileId, setRoleProfileId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Load existing profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData?.profile_summary) {
        setUserProfile(profileData.profile_summary as unknown as ProfileSummary);
      }

      // Load recent sessions
      const { data: sessionData } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionData) {
        setSessions(sessionData as InterviewSession[]);
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleProfileParsed = async (profile: ProfileSummary, resumeText: string) => {
    setUserProfile(profile);
    if (!user) return;

    // Upsert user profile
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase
        .from('user_profiles')
        .update({ resume_text: resumeText, profile_summary: profile as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_profiles')
        .insert({ user_id: user.id, resume_text: resumeText, profile_summary: profile as unknown as Record<string, unknown> });
    }
  };

  const handleRoleParsed = async (role: RoleSummary, input: string, inputType: 'url' | 'text' | 'screenshot') => {
    setRoleProfile(role);
    if (!user) return;

    const { data } = await supabase
      .from('role_profiles')
      .insert({
        user_id: user.id,
        role_input: input,
        role_input_type: inputType,
        role_summary: role as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (data) {
      setRoleProfileId(data.id);
    }
  };

  const startInterview = async () => {
    if (!user || !roleProfileId || !userProfile || !roleProfile) return;
    setStarting(true);

    const { data } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        role_profile_id: roleProfileId,
        status: 'in_progress',
      })
      .select()
      .single();

    if (data) {
      router.push(`/interview?session=${data.id}`);
    }
    setStarting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-coder-bg">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="text-coder-brown animate-spin" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coder-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-coder-text">
            <span className="text-coder-grey-dark">$</span> dashboard
          </h1>
          <p className="text-sm text-coder-text-dim mt-1">
            {"// Upload your resume, define a role, and start practicing"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Resume & Role */}
          <div className="space-y-6">
            <div className="bg-coder-surface border border-coder-border rounded-lg p-5">
              <ResumeUpload onProfileParsed={handleProfileParsed} existingProfile={userProfile} />
            </div>

            <div className="bg-coder-surface border border-coder-border rounded-lg p-5">
              <RoleInput onRoleParsed={handleRoleParsed} existingRole={roleProfile} />
            </div>

            {/* Start Interview Button */}
            {userProfile && roleProfile && (
              <button
                onClick={startInterview}
                disabled={starting}
                className="w-full bg-coder-brown/20 border-2 border-coder-brown/60 text-coder-brown hover:bg-coder-brown/30 rounded-lg px-6 py-4 text-base font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-[1.01]"
              >
                {starting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>initializing<span className="cursor-blink">_</span></span>
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    <span>$ ./start_interview</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right column: Past Sessions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-coder-text-dim" />
              <h3 className="text-sm font-medium text-coder-text">Recent Sessions</h3>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-coder-surface border border-coder-border rounded-lg p-8 text-center">
                <p className="text-sm text-coder-text-dim">
                  <span className="text-coder-grey-dark">{"// "}</span>No interview sessions yet
                </p>
                <p className="text-xs text-coder-text-dim mt-2">
                  Upload your resume and define a role to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <a
                    key={session.id}
                    href={`/interview?session=${session.id}&review=true`}
                    className="block bg-coder-surface border border-coder-border rounded-lg p-4 hover:border-coder-brown/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        session.status === 'completed'
                          ? 'bg-coder-success/20 text-coder-success'
                          : 'bg-coder-warning/20 text-coder-warning'
                      }`}>
                        {session.status}
                      </span>
                      <span className="text-xs text-coder-text-dim">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {session.overall_score !== null && (
                      <div className="flex items-center gap-2">
                        <Award size={14} className={
                          session.overall_score >= 80 ? 'text-coder-success' :
                          session.overall_score >= 60 ? 'text-coder-warning' : 'text-coder-error'
                        } />
                        <span className={`text-lg font-bold ${
                          session.overall_score >= 80 ? 'text-coder-success' :
                          session.overall_score >= 60 ? 'text-coder-warning' : 'text-coder-error'
                        }`}>
                          {session.overall_score}/100
                        </span>
                      </div>
                    )}
                    {session.overall_evaluation && (
                      <p className="text-xs text-coder-text-dim mt-2 line-clamp-2">
                        {session.overall_evaluation}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
