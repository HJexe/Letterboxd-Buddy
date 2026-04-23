export interface Movie {
  title: string;
  year?: string;
  rating?: number;
  review?: string;
  posterUrl?: string;
  backdropUrl?: string;
  id?: string;
}

export interface DiaryEntry {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  rating?: number;
  movieTitle: string;
  movieYear?: string;
  posterUrl?: string;
}

export type AspectRatio = "9:16" | "4:5" | "1:1";

export type Template = "Full Bleed" | "Minimal Centered" | "Monthly" | "Custom Grid";

export interface EditorState {
  username: string;
  entries: DiaryEntry[];
  selectedEntry: DiaryEntry | null;
  curatedEntries: DiaryEntry[]; 
  template: Template;
  aspectRatio: AspectRatio;
  background: string;
  accentColor: string;
  gridColumns: 2 | 3;
  showReview: boolean;
  movieDetails: any | null;
  customPosterUrl: string | null;
  tmdbPosters: string[];
  fanartPosters: string[];
  customTitle: string;
}
