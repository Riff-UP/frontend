// Shared types for the application

// Auth types
export interface User {
  id: string;
  name: string;
  email: string;
  googleId?: string;
  biography?: string;
  role: 'USER' | 'ARTIST';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'USER' | 'ARTIST';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ArtistData {
  id: string;
  name: string;
  biography?: string | null;
  role: 'USER' | 'ARTIST';
  status: boolean;
  createdAt: string;
  socialMedia?: { id: string; url: string }[];
  // campos opcionales para display
  coverImage?: string;
  profileImage?: string;
  followers?: number;
}

export interface Publication {
  id: string | number; // Permitir ambos tipos para compatibilidad
  content: string;
  image?: string;
  date: string;
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
  author?: {
    name: string;
    avatar: string;
  };
  time?: string;
  text?: string;
  saved?: number;
}

export interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  description?: string;
  isAttending?: boolean;
  attending?: boolean;
}

export interface ProfileData {
  name: string;
  description: string;
  followers: number;
  instagram: string;
  facebook: string;
  whatsapp: string;
  email: string;
}

// User from backend
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  googleId?: string | null;
  biography?: string | null;
  role: 'USER' | 'ARTIST';
  status: boolean;
  createdAt: string;
}

// Analytics types
export interface FollowerGrowthData {
  week: string;
  followers: number;
  date: string;
}

export interface InteractionData {
  week: string;
  interactions: number;
  date: string;
}

export interface EventAttendanceData {
  id: number;
  eventName: string;
  attendees: number;
}

export interface EventRatingData {
  id: number;
  eventName: string;
  averageRating: number;
  totalRatings: number;
}

export type TimeFilter = '7d' | '30d' | '90d' | '1y';
