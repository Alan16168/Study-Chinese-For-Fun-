export enum AppMode {
  HOME = 'HOME',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  READING = 'READING',
  WRITING = 'WRITING',
}

export interface Flashcard {
  word: string;
  pinyin: string;
  meaning: string;
  imageUrl?: string;
  exampleSentence?: string;
}

export interface Story {
  title: string;
  content: string;
  question: string;
  options: string[];
  answer: string;
}

export interface WritingResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
}
