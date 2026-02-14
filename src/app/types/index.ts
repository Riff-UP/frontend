// Shared types for the application

export interface ArtistData {
  id: number;
  name: string;
  followers: number;
  description: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  email: string;
  coverImage: string;
  profileImage?: string;
}

export interface Publication {
  id: number;
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
  id: number;
  title: string;
  location: string;
  date: string;
  time: string;
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
