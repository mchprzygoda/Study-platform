export interface QuizConfig {
  subjectId: string;
  numberOfQuestions: number;
  duration: number;
}

export interface QuizSession {
  id?: string;
  subjectId: string;
  questions: string[];
  startTime: Date;
  endTime?: Date;
  answers: { [questionId: string]: string[] };
}

