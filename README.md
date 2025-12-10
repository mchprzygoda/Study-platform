# 📚 Study Platform

**Study Platform** is a web application for organizing study materials, quizzes, and schedules in one place.

**Live demo**: https://mchprzygoda.github.io/Study-platform/

## Overview

Study Platform helps students:
- Organize subjects and courses
- Take and manage study notes
- Create and take practice quizzes
- Manage schedules with calendar events

All data is securely stored and accessible only to you.

---

## Getting Started

**Note:** You can create your own account or just use existing one.
**Account for test purpose:**
- e-mail: test2@test.com
- password: tescik123

### Registration
1. Click **"Sign Up"**
2. Fill in: Username, Email (format validation only), Password (min 8 characters)
3. Click **"Register"** - you'll be automatically logged in

### Login
1. Enter Email and Password
2. Click **"Login"**
3. Error message appears if credentials are incorrect

---

## Features

### Subjects
- Create, edit, and delete subjects
- Click hamburger menu (⋮) in top-right corner to edit or delete
- **Warning**: Deleting a subject also deletes all its notes and quizzes
- **Limit**: 10 subjects per user

### Notes
- Create, edit, and delete notes for each subject
- Click hamburger menu (⋮) on note cards for options
- **Limits**: 
  - 10 notes per subject
  - Title: 1-200 characters
  - Content: max 5000 characters

### Quizzes
- Create questions (single or multiple choice)
- Take quizzes and view results
- **Limits**:
  - 50 questions per subject
  - 2-6 answers per question
  - Question text: 1-500 characters
  - Answer text: 1-300 characters

### Calendar
- Create, edit, and delete events
- **Limits**:
  - 200 events per user
  - Event name: 1-200 characters
  - Description: max 1000 characters

---

## Platform Limits

| Feature | Limit |
|---------|-------|
| **User Accounts** | Limited (set by administrator) |
| **Subjects** | 10 per user |
| **Notes** | 10 per subject |
| **Quiz Questions** | 50 per subject |
| **Calendar Events** | 200 per user |

> **Tip**: Delete old items to make room for new ones.

---

## Tech Stack

- **Frontend**: Angular 18
- **Backend**: Firebase (Authentication, Firestore)
- **Security**: Firestore Security Rules, authenticated access
- **Styling**: Tailwind CSS

---

## Security Notes

- All user data is private and isolated per user
- Writes restricted via Firestore Security Rules
- Input validation and size limits enforced
- Password must be at least 8 characters long

---

**Happy Studying! 📚**
