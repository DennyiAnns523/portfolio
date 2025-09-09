// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project types
export interface Project extends BaseEntity {
  title: string;
  description: string;
  longDescription?: string;
  image: string;
  images?: string[];
  technologies: string[];
  category: ProjectCategory;
  featured: boolean;
  githubUrl?: string;
  liveUrl?: string;
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  slug: string;
}

export type ProjectCategory = 'web' | 'mobile' | 'desktop' | 'ui-ux' | 'other';
export type ProjectStatus = 'completed' | 'in-progress' | 'archived';

// Skill types
export interface Skill {
  name: string;
  level: SkillLevel;
  category: SkillCategory;
  icon?: string;
  description?: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillCategory = 'frontend' | 'backend' | 'mobile' | 'design' | 'tools' | 'soft-skills';

// Experience types
export interface Experience {
  id: string;
  company: string;
  position: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  location: string;
  type: EmploymentType;
  skills: string[];
  achievements: string[];
  companyUrl?: string;
  logo?: string;
}

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';

// Education types
export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  gpa?: number;
  location: string;
  description?: string;
  achievements?: string[];
}

// Blog types
export interface BlogPost extends BaseEntity {
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  tags: string[];
  category: string;
  published: boolean;
  readTime: number;
  slug: string;
  views: number;
  likes: number;
}

// Contact types
export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactSubmission extends ContactForm, BaseEntity {
  ip?: string;
  userAgent?: string;
  read: boolean;
}

// Social media types
export interface SocialLink {
  platform: SocialPlatform;
  url: string;
  username?: string;
}

export type SocialPlatform = 
  | 'github'
  | 'linkedin'
  | 'twitter'
  | 'instagram'
  | 'dribbble'
  | 'behance'
  | 'youtube'
  | 'twitch'
  | 'discord'
  | 'email';

// SEO types
export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Animation types
export interface AnimationProps {
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Component types
export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

export interface PageProps {
  params: { [key: string]: string | string[] };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Form types
export interface FormState {
  loading: boolean;
  error?: string;
  success?: boolean;
}

// Navigation types
export interface NavItem {
  name: string;
  href: string;
  current?: boolean;
  external?: boolean;
}

// Analytics types
export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}