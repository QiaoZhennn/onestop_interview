'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ResumeUpload from '@/components/ResumeUpload';
import RoleInput from '@/components/RoleInput';
import { ProfileSummary, RoleSummary } from '@/types';
import { Loader2, Play, ChevronRight, Clock, Award } from 'lucide-react';

interface Session {
  id: string;
  status: string;
  overall_score: number | null;
  overall_evaluation: string | null;
  created_at: string;
  role_profiles: {
    role_summary: RoleSummary;
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<ProfileSummary | null>(null);
  const [roleProfile, setRoleProfile] = useState<RoleSummary | null>(null);
  const [roleInput, setRoleInput] = useState('');
  const [roleInputType, setRoleInputType] = useState<'url' | 'text' | 'screenshot'>('text');
  const [sessions, setSessions] = useState<Session[]>([]);
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

      // Load existing profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile?.profile_summary) {
        setUserProfile(profile.profile_summary as unknown as ProfileSummary);
      }

      // Load past sessions
      const { data: pastSessions } = await supabase
        .from('interview_sessions')
        .select('*, role_profiles(role_summary)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pastSessions) {
        setSessions(pastSessions as unknown as Session[]);
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleProfileParsed = async (profile: ProfileSummary, resumeText: string) => {
    setUserProfile(profile);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_profiles').upsert({
      user_id: user.id,
      resume_text: resumeText,
      profile_summary: profile as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const handleRoleParsed = async (role: RoleSummary, input: string, inputType: 'url' | 'text' | 'screenshot') => {
    setRoleProfile(role);
    setRoleInput(input);
    setRoleInputType(inputType);
  };

  const startInterview = async () => {
    if (!userProfile || !roleProfile) return;
    setStarting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save role profile
    const { data: roleData } = await supabase
      .from('role_profiles')
      .insert({
        user_id: user.id,
        role_input: roleInput,
        role_input_type: roleInputType,
        role_summary: roleProfile as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (!roleData) {
      setStarting(false);
      return;
    }

    // Create interview session
    const { data: sessionData } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: user.id,
        role_profile_id: roleData.id,
      })
      .select()
      .single();

    if (sessionData) {
      router.push(`/interview?session=${sessionData.id}`);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-coder-text">
            Dashboard
          </h1>
          <p className="text-sm text-coder-text-dim mt-1">
            Upload your resume, define a role, and start practicing
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
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    <span>Start Interview</span>
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
                  No interview sessions yet
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
                    href={`/interview?session=${session.id}&review=${session.status === 'completed'}`}
                    className="block bg-coder-surface border border-coder-border rounded-lg p-4 hover:border-coder-brown/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-coder-text font-medium truncate">
                          {session.role_profiles?.role_summary?.title || 'Interview Session'}
                        </p>
                        <p className="text-xs text-coder-text-dim mt-0.5">
                          {session.role_profiles?.role_summary?.company || 'Unknown Company'}
                        </p>
                        <p className="text-xs text-coder-text-dim mt-1">
                          {new Date(session.created_at).toLocaleDateString()} at{' '}
                          {new Date(session.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {session.status === 'completed' && session.overall_score !== null ? (
                          <div className="flex items-center gap-1">
                            <Award size={14} className={
                              session.overall_score >= 80 ? 'text-coder-success' :
                              session.overall_score >= 60 ? 'text-coder-warning' : 'text-coder-error'
                            } />
                            <span className={`text-sm font-bold ${
                              session.overall_score >= 80 ? 'text-coder-success' :
                              session.overall_score >= 60 ? 'text-coder-warning' : 'text-coder-error'
                            }`}>
                              {session.overall_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-coder-warning bg-coder-warning/10 px-2 py-0.5 rounded">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
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
