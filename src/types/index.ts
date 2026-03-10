export interface UserProfile {
  id: string;
  user_id: string;
  resume_text: string | null;
  profile_summary: ProfileSummary | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileSummary {
  name: string;
  years_of_experience: number;
  current_role: string;
  industry: string;
  skills: string[];
  education: string;
  summary: string;
}

export interface RoleProfile {
  id: string;
  user_id: string;
  role_input: string;
  role_input_type: 'url' | 'text' | 'screenshot';
  role_summary: RoleSummary | null;
  created_at: string;
}

export interface RoleSummary {
  title: string;
  company: string;
  level: string;
  department: string;
  key_responsibilities: string[];
  required_skills: string[];
  preferred_qualifications: string[];
  summary: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  role_profile_id: string;
  status: 'in_progress' | 'completed';
  overall_score: number | null;
  overall_evaluation: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface InterviewQA {
  id: string;
  session_id: string;
  question_number: number;
  question_text: string;
  answer_text: string | null;
  answer_type: 'text' | 'voice' | null;
  score: number | null;
  evaluation: string | null;
  created_at: string;
}
