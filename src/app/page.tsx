'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Briefcase } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-coder-bg flex items-center justify-center">
      <div className="text-center">
        <Briefcase className="text-coder-brown mx-auto mb-4 animate-pulse" size={40} />
        <p className="text-coder-text-dim text-sm">Loading...</p>
      </div>
    </div>
  );
}
