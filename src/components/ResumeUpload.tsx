'use client';

import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, Type, Image } from 'lucide-react';
import { ProfileSummary } from '@/types';

interface ResumeUploadProps {
  onProfileParsed: (profile: ProfileSummary, resumeText: string) => void;
  existingProfile?: ProfileSummary | null;
}

type InputMode = 'screenshot' | 'text';

export default function ResumeUpload({ onProfileParsed, existingProfile }: ResumeUploadProps) {
  const [mode, setMode] = useState<InputMode>('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfileSummary | null>(existingProfile || null);
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      let res: Response;

      if (mode === 'screenshot') {
        if (!selectedFile) {
          throw new Error('Please select a resume screenshot');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await fetch('/api/parse-resume', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!textInput.trim()) {
          throw new Error('Please describe your background');
        }
        res = await fetch('/api/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput.trim() }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to parse resume');
      }

      const data = await res.json();
      setProfile(data.profile);
      onProfileParsed(data.profile, data.resumeText);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse resume';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { mode: InputMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'text', label: 'Describe Yourself', icon: <Type size={14} /> },
    { mode: 'screenshot', label: 'Upload Screenshot', icon: <Image size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-coder-brown text-xs font-bold">Step 1</span>
        <h3 className="text-sm font-medium text-coder-text">Your Background</h3>
      </div>

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

      <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
          <span className="text-xs text-coder-text-dim">
            {mode === 'text' ? 'Self Description' : 'Resume Screenshot'}
          </span>
        </div>
        <div className="p-4">
          {mode === 'text' ? (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Briefly describe your professional background, skills, experience, and education. For example: I'm a software engineer with 5 years of experience in full-stack web development. I've worked at startups and large companies, specializing in React, Node.js, and cloud infrastructure..."
              className="w-full bg-coder-bg border border-coder-border rounded px-3 py-2 text-sm text-coder-text terminal-input focus:border-coder-brown focus:outline-none transition-colors min-h-[140px] resize-y"
            />
          ) : (
            <div className="space-y-3">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                  ${selectedFile ? 'border-coder-success/40 bg-coder-success/5' : 'border-coder-border hover:border-coder-brown/50'}`}
                onClick={() => document.getElementById('resume-screenshot')?.click()}
              >
                <input
                  id="resume-screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="text-coder-success" size={24} />
                    <p className="text-sm text-coder-text">{selectedFile.name}</p>
                    <p className="text-xs text-coder-text-dim">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="text-coder-grey-dark" size={24} />
                    <p className="text-sm text-coder-text">Click to upload resume screenshot</p>
                    <p className="text-xs text-coder-text-dim">PNG, JPG, WEBP supported</p>
                  </div>
                )}
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Resume preview" className="w-full rounded border border-coder-border max-h-48 object-contain bg-white" />
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-3 w-full bg-coder-brown/20 border border-coder-brown/40 text-coder-brown hover:bg-coder-brown/30 rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze Background</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-coder-error text-xs bg-coder-error/10 border border-coder-error/20 rounded px-3 py-2">
          {error}
        </div>
      )}

      {profile && (
        <div className="bg-coder-card border border-coder-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-coder-border bg-coder-surface">
            <span className="text-xs text-coder-text-dim flex items-center gap-1">
              <FileText size={12} />
              Profile Summary
            </span>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-coder-text-dim text-xs">Name</span>
                <p className="text-coder-brown">{profile.name}</p>
              </div>
              <div>
                <span className="text-coder-text-dim text-xs">Experience</span>
                <p className="text-coder-text">{profile.years_of_experience} years</p>
              </div>
              <div>
                <span className="text-coder-text-dim text-xs">Current Role</span>
                <p className="text-coder-text">{profile.current_role}</p>
              </div>
              <div>
                <span className="text-coder-text-dim text-xs">Industry</span>
                <p className="text-coder-text">{profile.industry}</p>
              </div>
            </div>
            <div>
              <span className="text-coder-text-dim text-xs">Skills</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="text-xs bg-coder-brown/10 text-coder-brown border border-coder-brown/20 rounded px-2 py-0.5">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-coder-text-dim text-xs">Education</span>
              <p className="text-coder-text text-xs">{profile.education}</p>
            </div>
            <div>
              <span className="text-coder-text-dim text-xs">Summary</span>
              <p className="text-coder-text text-xs leading-relaxed">{profile.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
