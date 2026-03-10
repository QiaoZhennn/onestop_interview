'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Menu, X, Terminal, LogOut } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="border-b border-coder-border bg-coder-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <a href="/dashboard" className="flex items-center gap-2 text-coder-brown hover:text-coder-brown-light transition-colors">
            <Terminal size={20} />
            <span className="text-lg font-bold tracking-tight">
              <span className="text-coder-grey">~/</span>onestop_interview
            </span>
          </a>

          {user && (
            <>
              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-6">
                <a href="/dashboard" className="text-sm text-coder-text-dim hover:text-coder-brown transition-colors">
                  <span className="text-coder-grey-dark">$</span> dashboard
                </a>
                <a href="/interview" className="text-sm text-coder-text-dim hover:text-coder-brown transition-colors">
                  <span className="text-coder-grey-dark">$</span> interview
                </a>
                <div className="h-4 w-px bg-coder-border" />
                <span className="text-xs text-coder-text-dim">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-coder-text-dim hover:text-coder-error transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden text-coder-text-dim hover:text-coder-brown"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="md:hidden border-t border-coder-border py-3 space-y-2">
            <a href="/dashboard" className="block text-sm text-coder-text-dim hover:text-coder-brown py-1">
              <span className="text-coder-grey-dark">$</span> dashboard
            </a>
            <a href="/interview" className="block text-sm text-coder-text-dim hover:text-coder-brown py-1">
              <span className="text-coder-grey-dark">$</span> interview
            </a>
            <div className="border-t border-coder-border pt-2 mt-2">
              <span className="text-xs text-coder-text-dim block mb-2">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-coder-error hover:text-red-400 flex items-center gap-1"
              >
                <LogOut size={14} /> logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
