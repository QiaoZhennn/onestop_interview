'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';
import { ProfileSummary } from '@/types';

interface ResumeUploadProps {
  onProfileParsed: (profile: ProfileSummary, resumeText: string) => void;
  existingProfile?: ProfileSummary | null;
}

export default function ResumeUpload({ onProfileParsed, existingProfile }: ResumeUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [profile, setProfile] = useState<ProfileSummary | null>(existingProfile || null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

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
  }, [onProfileParsed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-coder-brown text-xs font-bold">Step 1</span>
        <h3 className="text-sm font-medium text-coder-text">Upload Resume</h3>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-coder-brown bg-coder-brown/5' : 'border-coder-border hover:border-coder-brown/50'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-coder-brown animate-spin" size={32} />
            <p className="text-sm text-coder-text-dim">
              Parsing {fileName}...
            </p>
          </div>
        ) : fileName && profile ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="text-coder-success" size={32} />
            <p className="text-sm text-coder-text-dim">
              {fileName} parsed successfully
            </p>
            <p className="text-xs text-coder-text-dim">Drop a new file to re-upload</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="text-coder-grey-dark" size={32} />
            <div>
              <p className="text-sm text-coder-text">
                {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
              </p>
              <p className="text-xs text-coder-text-dim mt-1">PDF, TXT, DOC, DOCX supported</p>
            </div>
          </div>
        )}
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
