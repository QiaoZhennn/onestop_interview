'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Terminal, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-coder-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Terminal className="text-coder-brown" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-coder-text">
            <span className="text-coder-grey-dark">~/</span>
            <span className="text-coder-brown">onestop_interview</span>
          </h1>
          <p className="text-coder-text-dim text-sm mt-2">AI-powered interview preparation</p>
        </div>

        {/* Login form */}
        <div className="bg-coder-surface border border-coder-border rounded-lg overflow-hidden">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-coder-card border-b border-coder-border">
            <div className="w-3 h-3 rounded-full bg-coder-error/60" />
            <div className="w-3 h-3 rounded-full bg-coder-warning/60" />
            <div className="w-3 h-3 rounded-full bg-coder-success/60" />
            <span className="text-xs text-coder-text-dim ml-2">login.sh</span>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="text-xs text-coder-text-dim block mb-1">
                <span className="text-coder-brown">const</span> email =
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-coder-bg border border-coder-border rounded px-3 py-2 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="text-xs text-coder-text-dim block mb-1">
                <span className="text-coder-brown">const</span> password =
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-coder-bg border border-coder-border rounded px-3 py-2 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-coder-error text-xs bg-coder-error/10 border border-coder-error/20 rounded px-3 py-2">
                <span className="text-coder-error/60">error:</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coder-brown/20 border border-coder-brown/40 text-coder-brown hover:bg-coder-brown/30 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="cursor-blink">_</span>
              ) : (
                <>
                  <span>$ ./login</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-coder-text-dim mt-4">
          No account?{' '}
          <a href="/signup" className="text-coder-brown hover:text-coder-brown-light transition-colors">
            ./signup
          </a>
        </p>
      </div>
    </div>
  );
}
