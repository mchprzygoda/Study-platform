import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { SubjectService } from '../../../subject/subject.service';
import { QuestionModel } from '../../models/question.model';
import { SubjectModel } from '../../../subject/subject.model';
import { Subscription, interval } from 'rxjs';

interface QuizAnswer {
  questionId: string;
  selectedAnswers: string[];
}

@Component({
  selector: 'app-quiz-take',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quiz-take.component.html',
  styleUrls: ['./quiz-take.component.scss']
})
export class QuizTakeComponent implements OnInit, OnDestroy {
  private quizService = inject(QuizService);
  private subjectService = inject(SubjectService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  private timerSubscription?: Subscription;
  private questionsSubscription?: Subscription;

  subjectId = signal<string | null>(null);
  subject = signal<SubjectModel | null>(null);
  allQuestions = signal<QuestionModel[]>([]);
  quizQuestions = signal<QuestionModel[]>([]);
  
  numberOfQuestions = signal(5);
  duration = signal(5);
  
  timeRemaining = signal(0);
  currentQuestionIndex = signal(0);
  answers = signal<QuizAnswer[]>([]);
  isQuizFinished = signal(false);
  score = signal(0);
  totalQuestions = signal(0);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.subjectId.set(id);
        this.loadSubject(id);
        this.loadQuestions(id);
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['questions']) {
        this.numberOfQuestions.set(+params['questions']);
      }
      if (params['duration']) {
        this.duration.set(+params['duration']);
      }
    });
  }

  ngOnDestroy() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.questionsSubscription) {
      this.questionsSubscription.unsubscribe();
    }
  }

  loadSubject(subjectId: string) {
    this.subjectService.getSubjects().subscribe(subjects => {
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        this.subject.set(subject);
      } else {
        this.router.navigate(['/quiz']);
      }
    });
  }

  loadQuestions(subjectId: string) {
    this.questionsSubscription = this.quizService.getQuestions(subjectId).subscribe(questions => {
      this.allQuestions.set(questions);
      
      if (questions.length === 0) {
        alert('No questions for this subject');
        this.router.navigate(['/quiz', subjectId]);
        return;
      }

      const numQuestions = Math.min(this.numberOfQuestions(), questions.length);
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, numQuestions);
      
      this.quizQuestions.set(selected);
      this.totalQuestions.set(selected.length);
      
      this.answers.set(selected.map(q => ({
        questionId: q.id!,
        selectedAnswers: []
      })));

      this.startTimer();
    });
  }

  startTimer() {
    const totalSeconds = this.duration() * 60;
    this.timeRemaining.set(totalSeconds);

    this.timerSubscription = interval(1000).subscribe(() => {
      const remaining = this.timeRemaining();
      if (remaining > 0) {
        this.timeRemaining.set(remaining - 1);
      } else {
        this.finishQuiz();
      }
    });
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  toggleAnswer(questionId: string, answerId: string) {
    if (this.isQuizFinished()) return;

    const question = this.quizQuestions().find(q => q.id === questionId);
    if (!question) return;

    const currentAnswers = [...this.answers()];
    const answerIndex = currentAnswers.findIndex(a => a.questionId === questionId);
    
    if (answerIndex === -1) return;

    const answer = currentAnswers[answerIndex];

    if (question.type === 'single') {
      answer.selectedAnswers = [answerId];
    } else {
      const selectedIndex = answer.selectedAnswers.indexOf(answerId);
      if (selectedIndex > -1) {
        answer.selectedAnswers.splice(selectedIndex, 1);
      } else {
        answer.selectedAnswers.push(answerId);
      }
    }

    this.answers.set([...currentAnswers]);
  }

  isAnswerSelected(questionId: string, answerId: string): boolean {
    const answer = this.answers().find(a => a.questionId === questionId);
    return answer?.selectedAnswers.includes(answerId) || false;
  }

  hasAnswer(questionId: string): boolean {
    const answer = this.answers().find(a => a.questionId === questionId);
    return (answer?.selectedAnswers.length ?? 0) > 0;
  }

  nextQuestion() {
    const currentIndex = this.currentQuestionIndex();
    if (currentIndex < this.quizQuestions().length - 1) {
      this.currentQuestionIndex.set(currentIndex + 1);
    }
  }

  previousQuestion() {
    const currentIndex = this.currentQuestionIndex();
    if (currentIndex > 0) {
      this.currentQuestionIndex.set(currentIndex - 1);
    }
  }

  goToQuestion(index: number) {
    this.currentQuestionIndex.set(index);
  }

  finishQuiz() {
    if (this.isQuizFinished()) return;

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    let correct = 0;
    this.quizQuestions().forEach(question => {
      const userAnswer = this.answers().find(a => a.questionId === question.id);
      if (!userAnswer) return;

      const correctAnswers = question.answers
        .filter(a => a.isCorrect)
        .map(a => a.id)
        .sort()
        .join(',');

      const selectedAnswers = [...userAnswer.selectedAnswers].sort().join(',');

      if (correctAnswers === selectedAnswers && 
          userAnswer.selectedAnswers.length === question.answers.filter(a => a.isCorrect).length) {
        correct++;
      }
    });

    this.score.set(correct);
    this.isQuizFinished.set(true);
  }

  exitQuiz() {
    if (!this.isQuizFinished()) {
      if (!confirm('Are you sure you want to exit the quiz? The progress will not be saved.')) {
        return;
      }
    }
    const subjectId = this.subjectId();
    if (subjectId) {
      this.router.navigate(['/quiz', subjectId]);
    } else {
      this.router.navigate(['/quiz']);
    }
  }

  getCurrentQuestion(): QuestionModel | undefined {
    return this.quizQuestions()[this.currentQuestionIndex()];
  }

  getProgressPercentage(): number {
    return ((this.currentQuestionIndex() + 1) / this.totalQuestions()) * 100;
  }

  getQuestionResult(question: QuestionModel): { isCorrect: boolean; userAnswersText: string; correctAnswersText: string } | null {
    const userAnswer = this.answers().find(a => a.questionId === question.id);
    if (!userAnswer) return null;

    const correctAnswers = question.answers.filter(a => a.isCorrect);
    const correctAnswerIds = correctAnswers.map(a => a.id).sort().join(', ');
    const userAnswerIds = [...userAnswer.selectedAnswers].sort().join(', ');

    const isCorrect = correctAnswerIds === userAnswerIds && 
                      userAnswer.selectedAnswers.length === correctAnswers.length;

    const userAnswersText = userAnswer.selectedAnswers.length > 0
      ? question.answers
          .filter(a => userAnswer.selectedAnswers.includes(a.id))
          .map(a => a.text)
          .join(', ')
      : 'No answers';

    const correctAnswersText = correctAnswers.map(a => a.text).join(', ');

    return { isCorrect, userAnswersText, correctAnswersText };
  }

  Math = Math;
}

