import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { QuestionModel, AnswerOption } from '../models/question.model';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // Get all questions for a subject
  getQuestions(subjectId: string): Observable<QuestionModel[]> {
    const questionsRef = collection(this.firestore, `quizzes/${subjectId}/questions`);
    const q = query(questionsRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<QuestionModel[]>;
  }

  // Add a new question
  async addQuestion(question: Omit<QuestionModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const user = this.authService.getUser();
    if (!user) throw new Error('User not logged in');

    // Check limit: max 50 questions per subject
    const questionsRef = collection(this.firestore, `quizzes/${question.subjectId}/questions`);
    const snapshot = await getDocs(questionsRef);
    
    if (snapshot.size >= 50) {
      throw new Error('Maximum limit of 50 questions per subject reached. Please delete a question before creating a new one.');
    }

    // Validate question text length (1-500 characters)
    if (question.question.length < 1 || question.question.length > 500) {
      throw new Error('Question text must be between 1 and 500 characters.');
    }

    // Validate answers array
    if (!question.answers || question.answers.length < 2 || question.answers.length > 6) {
      throw new Error('Question must have between 2 and 6 answers.');
    }

    // Validate each answer text length (1-300 characters)
    for (const answer of question.answers) {
      if (answer.text.length < 1 || answer.text.length > 300) {
        throw new Error('Each answer text must be between 1 and 300 characters.');
      }
    }
    
    await addDoc(questionsRef, {
      subjectId: question.subjectId,
      question: question.question,
      answers: question.answers,
      type: question.type,
      createdAt: Timestamp.now(),
    });
  }

  // Update an existing question
  async updateQuestion(
    subjectId: string,
    questionId: string,
    question: { question: string; answers: AnswerOption[]; type: 'single' | 'multiple' }
  ): Promise<void> {
    // Validate question text length (1-500 characters)
    if (question.question.length < 1 || question.question.length > 500) {
      throw new Error('Question text must be between 1 and 500 characters.');
    }

    // Validate answers array
    if (!question.answers || question.answers.length < 2 || question.answers.length > 6) {
      throw new Error('Question must have between 2 and 6 answers.');
    }

    // Validate each answer text length (1-300 characters)
    for (const answer of question.answers) {
      if (answer.text.length < 1 || answer.text.length > 300) {
        throw new Error('Each answer text must be between 1 and 300 characters.');
      }
    }

    const questionDocRef = doc(this.firestore, `quizzes/${subjectId}/questions/${questionId}`);
    await updateDoc(questionDocRef, {
      question: question.question,
      answers: question.answers,
      type: question.type,
      updatedAt: Timestamp.now(),
    });
  }

  // Delete a question
  async deleteQuestion(subjectId: string, questionId: string): Promise<void> {
    const questionDocRef = doc(this.firestore, `quizzes/${subjectId}/questions/${questionId}`);
    await deleteDoc(questionDocRef);
  }
}

