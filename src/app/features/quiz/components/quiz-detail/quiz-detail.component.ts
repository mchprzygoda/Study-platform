import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { QuizService } from '../../services/quiz.service';
import { SubjectService } from '../../../subject/subject.service';
import { QuestionModel, AnswerOption } from '../../models/question.model';
import { SubjectModel } from '../../../subject/subject.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription, filter, first } from 'rxjs';
import { ConfirmDeleteModalComponent } from '../../../../components/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-quiz-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ConfirmDeleteModalComponent],
  templateUrl: './quiz-detail.component.html',
  styleUrls: ['./quiz-detail.component.scss']
})
export class QuizDetailComponent implements OnInit, OnDestroy {
  private quizService = inject(QuizService);
  private subjectService = inject(SubjectService);
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private fb = inject(FormBuilder);

  private questionsSubscription?: Subscription;

  subjectId = signal<string | null>(null);
  subject = signal<SubjectModel | null>(null);
  questions = signal<QuestionModel[]>([]);

  isQuestionModalOpen = signal(false);
  isEditMode = signal(false);
  selectedQuestion = signal<QuestionModel | null>(null);
  isDeleteConfirmModalOpen = signal(false);
  questionToDelete = signal<QuestionModel | null>(null);

  isQuizStartPanelOpen = signal(false);
  numberOfQuestions = signal(5);
  duration = signal(5);

  questionForm = this.fb.nonNullable.group({
    question: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(500)]],
    type: ['single' as 'single' | 'multiple', Validators.required],
    answers: this.fb.array<FormControl<{ id: string; text: string; isCorrect: boolean }>>([])
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.subjectId.set(id);
        this.loadSubject(id);
        this.loadQuestions(id);
      }
    });
  }

  ngOnDestroy() {
    if (this.questionsSubscription) {
      this.questionsSubscription.unsubscribe();
    }
  }

  loadSubject(subjectId: string) {
    this.subjectService.getSubjects().pipe(
      filter(subjects => subjects.length > 0),
      first()
    ).subscribe(subjects => {
      const subject = subjects.find(s => s.id === subjectId);
      if (subject) {
        this.subject.set(subject);
      } else {
        this.router.navigate(['/quiz']);
      }
    });
  }

  loadQuestions(subjectId: string) {
    if (this.questionsSubscription) {
      this.questionsSubscription.unsubscribe();
    }
    this.questionsSubscription = this.quizService.getQuestions(subjectId).subscribe(questions => {
      this.questions.set(questions);
    });
  }

  get answersFormArray() {
    return this.questionForm.get('answers') as FormArray;
  }

  openQuestionModal(question?: QuestionModel) {
    if (question) {
      this.isEditMode.set(true);
      this.selectedQuestion.set(question);
      this.questionForm.patchValue({
        question: question.question,
        type: question.type
      });
      
      while (this.answersFormArray.length > 0) {
        this.answersFormArray.removeAt(0);
      }
      
      question.answers.forEach(answer => {
        this.answersFormArray.push(
          this.fb.control({
            id: answer.id,
            text: answer.text,
            isCorrect: answer.isCorrect
          } as AnswerOption)
        );
      });
    } else {
      this.isEditMode.set(false);
      this.selectedQuestion.set(null);
      this.questionForm.reset({
        question: '',
        type: 'single',
        answers: []
      });
      while (this.answersFormArray.length > 0) {
        this.answersFormArray.removeAt(0);
      }
      this.addAnswer();
      this.addAnswer();
    }
    this.isQuestionModalOpen.set(true);
  }

  closeQuestionModal() {
    this.isQuestionModalOpen.set(false);
    this.questionForm.reset();
    while (this.answersFormArray.length > 0) {
      this.answersFormArray.removeAt(0);
    }
    this.isEditMode.set(false);
    this.selectedQuestion.set(null);
  }

  addAnswer() {
    if (this.answersFormArray.length >= 6) {
      alert('Maximum limit of 6 answers per question reached.');
      return;
    }
    
    const answerControl = this.fb.control({
      id: this.generateId(),
      text: '',
      isCorrect: false
    } as AnswerOption);
    this.answersFormArray.push(answerControl);
  }

  removeAnswer(index: number) {
    if (this.answersFormArray.length > 2) {
      this.answersFormArray.removeAt(index);
    }
  }

  updateAnswerText(index: number, text: string) {
    if (text.length > 300) {
      alert('Answer text cannot exceed 300 characters.');
      return;
    }
    
    const answerControl = this.answersFormArray.at(index);
    const currentValue = answerControl.value;
    answerControl.patchValue({
      ...currentValue,
      text: text
    });
  }

  toggleCorrectAnswer(index: number) {
    const answerControl = this.answersFormArray.at(index);
    const currentValue = answerControl.value;
    const questionType = this.questionForm.get('type')?.value;
    
    if (questionType === 'single') {
      this.answersFormArray.controls.forEach((control, i) => {
        if (i === index) {
          control.patchValue({ ...control.value, isCorrect: true });
        } else {
          control.patchValue({ ...control.value, isCorrect: false });
        }
      });
    } else {
      answerControl.patchValue({
        ...currentValue,
        isCorrect: !currentValue.isCorrect
      });
    }
  }

  async saveQuestion() {
    if (this.questionForm.invalid) return;
    if (this.answersFormArray.length < 2) {
      alert('You need to add at least 2 answers');
      return;
    }

    if (this.answersFormArray.length > 6) {
      alert('Maximum 6 answers per question');
      return;
    }

    const formValue = this.questionForm.getRawValue();
    const subjectId = this.subjectId();
    if (!subjectId) return;

    const answers: AnswerOption[] = formValue.answers.map((a, index) => ({
      id: a.id || this.generateId(),
      text: a.text.trim(),
      isCorrect: a.isCorrect
    }));

    if (!answers.some(a => a.isCorrect)) {
      alert('You need to select at least one correct answer');
      return;
    }

    if (answers.some(a => !a.text)) {
      alert('All answers must have text');
      return;
    }

    if (answers.some(a => a.text.length < 1 || a.text.length > 300)) {
      alert('Text of each answer must be between 1 and 300 characters');
      return;
    }

    try {
      if (this.isEditMode() && this.selectedQuestion()?.id) {
        await this.quizService.updateQuestion(
          subjectId,
          this.selectedQuestion()!.id!,
          {
            question: formValue.question.trim(),
            answers: answers,
            type: formValue.type
          }
        );
      } else {
        await this.quizService.addQuestion({
          subjectId: subjectId,
          question: formValue.question.trim(),
          answers: answers,
          type: formValue.type
        });
      }
      this.closeQuestionModal();
    } catch (error) {
      console.error('Error saving question:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while saving the question');
    }
  }

  onDeleteQuestion(question: QuestionModel) {
    this.questionToDelete.set(question);
    this.isDeleteConfirmModalOpen.set(true);
  }

  async deleteQuestion() {
    const question = this.questionToDelete();
    if (!question) return;
    
    const subjectId = this.subjectId();
    if (!subjectId || !question.id) return;

    try {
      await this.quizService.deleteQuestion(subjectId, question.id);
      this.closeDeleteConfirmModal();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('An error occurred while deleting the question');
    }
  }

  closeDeleteConfirmModal(): void {
    this.isDeleteConfirmModalOpen.set(false);
    this.questionToDelete.set(null);
  }

  toggleQuizStartPanel() {
    this.isQuizStartPanelOpen.set(!this.isQuizStartPanelOpen());
  }

  startQuiz() {
    const subjectId = this.subjectId();
    if (!subjectId) return;

    if (this.questions().length === 0) {
      alert('No questions for this subject');
      return;
    }

    if (this.numberOfQuestions() > this.questions().length) {
      alert(`You only have ${this.questions().length} questions. Select a smaller number.`);
      return;
    }

    this.router.navigate(['/quiz', subjectId, 'take'], {
      queryParams: {
        questions: this.numberOfQuestions(),
        duration: this.duration()
      }
    });
    this.isQuizStartPanelOpen.set(false);
  }

  getDurationOptions(): number[] {
    const options: number[] = [];
    for (let i = 5; i <= 60; i += 5) {
      options.push(i);
    }
    return options;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}


