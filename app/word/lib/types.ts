export interface Word {
  id: string;
  word: string;
  translation: string;
  phoneticUS: string;
  phoneticUK: string;
  definition: string;
  category: string;
}

export interface CatalogFirst {
  id: number;
  name: string;
  slug: string;
  seconds: CatalogSecond[];
}

export interface CatalogSecond {
  id: number;
  name: string;
  slug: string;
  thirds: CatalogThird[];
}

export interface CatalogThird {
  id: number;
  name: string;
  slug: string;
}

export interface WordSet {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isPro: boolean;
  level?: string;
  coverImage?: string;
  createdTime?: string;
  learnersCount?: number;
  lastStudiedAt?: string | null;
  _count: { words: number; done: number };
}

export interface WordGroupSummary {
  id: number;
  name: string;
  kind: string;
  order: number;
  total: number;
  done: number;
  lastStudiedAt: string | null;
}

export type WordInputStatus = 'pending' | 'correct' | 'wrong';

export type StudyMode = 'spelling' | 'dictation' | null;
