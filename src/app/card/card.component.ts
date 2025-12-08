import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() subjectName: string = '';
  @Input() showActions: boolean = true;
  @Input() clickable: boolean = false;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() cardClick = new EventEmitter<void>();

  isMenuOpen = signal(false);

  onEditClick() {
    this.edit.emit();
    this.isMenuOpen.set(false);
  }

  onDeleteClick() {
    this.delete.emit();
    this.isMenuOpen.set(false);
  }

  onCardClick() {
    if (this.clickable && !this.isMenuOpen()) {
      this.cardClick.emit();
    }
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isMenuOpen.update(value => !value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-container')) {
      this.isMenuOpen.set(false);
    }
  }
}