'use client';

import { useState } from 'react';
import { Link, FileText, Type, Loader2, Briefcase } from 'lucide-react';
import { RoleSummary } from '@/types';

interface RoleInputProps {
  onRoleParsed: (role: RoleSummary, input: string, inputType: 'url' | 'text' | 'screenshot') => void;
  existingRole?: RoleSummary | null;
}

type InputMode = 'url' | 'text' | 'screenshot';

export default function RoleInput({ onRoleParsed, existingRole }: RoleInputProps) {
  const [mode, setMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<RoleSummary | null>(existingRole || null);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      let body: FormData | string;
      const headers: Record<string, string> = {};

      if (mode === 'screenshot') {
        const fileInput = document.getElementById('screenshot-input') as HTMLInputElement;
        if (!fileInput?.files?.[0]) {
          throw new Error('Please select a screenshot');
        }
        body = new FormData();
        (body as FormData).append('file', fileInput.files[0]);
        (body as FormData).append('type', 'screenshot');
      } else {
        const input = mode === 'url' ? urlInput : textInput;
        if (!input.trim()) {
          throw new Error('Please provide input');
        }
        body = JSON.stringify({ type: mode, input: input.trim() });
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch('/api/parse-role', {
        method: 'POST',
        headers,
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to parse role');
      }

      const data = await res.json();
      setRole(data.role);
      onRoleParsed(data.role, mode === 'url' ? urlInput : textInput, mode);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse role';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { mode: InputMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'text', label: 'text', icon: <Type size={14} /> },
    { mode: 'url', label: 'url', icon: <Link size={14} /> },
    { mode: 'screenshot', label: 'image', icon: <FileText size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-coder-brown text-xs">02</span>
        <h3 className="text-sm font-medium text-coder-text">Define Target Role</h3>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-coder-bg border border-coder-border rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setMode(tab.mode)}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs transition-colors
              ${mode === tab.mode
                ? 'bg-coder-brown/20 text-coder-brown border border-coder-brown/30'
                : 'text-coder-text-dim hover:text-coder-text'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
          <span className="text-xs text-coder-text-dim">
            role_input.{mode === 'screenshot' ? 'png' : mode === 'url' ? 'link' : 'txt'}
          </span>
        </div>
        <div className="p-4">
          {mode === 'text' && (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full bg-coder-bg border border-coder-border rounded px-3 py-2 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors min-h-[120px] resize-y"
            />
          )}
          {mode === 'url' && (
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://jobs.example.com/role/123"
              className="w-full bg-coder-bg border border-coder-border rounded px-3 py-2 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors"
            />
          )}
          {mode === 'screenshot' && (
            <input
              id="screenshot-input"
              type="file"
              accept="image/*"
              className="w-full text-sm text-coder-text-dim file:mr-4 file:py-1 file:px-3 file:rounded file:border file:border-coder-border file:text-xs file:bg-coder-surface file:text-coder-text hover:file:bg-coder-card"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-3 w-full bg-coder-brown/20 border border-coder-brown/40 text-coder-brown hover:bg-coder-brown/30 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>analyzing<span className="cursor-blink">_</span></span>
              </>
            ) : (
              <span>$ ./analyze_role</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-coder-error text-xs bg-coder-error/10 border border-coder-error/20 rounded px-3 py-2">
          <span className="text-coder-error/60">error:</span> {error}
        </div>
      )}

      {role && (
        <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
            <span className="text-xs text-coder-text-dim">
              <Briefcase size={12} className="inline mr-1" />
              role_summary.json
            </span>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-coder-text-dim text-xs">title:</span>
                <p className="text-coder-brown">{role.title}</p>
              </div>
              <div>
                <span className="text-coder-text-dim text-xs">company:</span>
                <p className="text-coder-text">{role.company}</p>
              </div>
              <div>
                <span className="text-coder-text-dim text-xs">level:</span>
                <p className="text-coder-text">{role.level}</p>
              </div>
              <div>
                <span className="text-coder-text-dim text-xs">department:</span>
                <p className="text-coder-text">{role.department}</p>
              </div>
            </div>
            <div>
              <span className="text-coder-text-dim text-xs">key_responsibilities:</span>
              <ul className="mt-1 space-y-1">
                {role.key_responsibilities.map((r, i) => (
                  <li key={i} className="text-xs text-coder-text flex gap-2">
                    <span className="text-coder-grey-dark shrink-0">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-coder-text-dim text-xs">required_skills:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {role.required_skills.map((skill, i) => (
                  <span key={i} className="text-xs bg-coder-brown/10 text-coder-brown border border-coder-brown/20 rounded px-2 py-0.5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-coder-text-dim text-xs">summary:</span>
              <p className="text-coder-text text-xs leading-relaxed">{role.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
