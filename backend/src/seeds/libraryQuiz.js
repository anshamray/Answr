/**
 * Seed script – inserts a "General Knowledge Trivia" quiz into the library.
 *
 * Usage:
 *   node src/seeds/libraryQuiz.js
 *
 * The quiz is created as official + published so it appears in /api/library
 * immediately.  A temporary admin user is used as the owner; if one already
 * exists it is reused.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/answr';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Ensure an admin user exists to own the quiz
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = new User({
      name: 'Answr Admin',
      email: 'admin@answr.local',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();
    console.log('Created admin user (admin@answr.local / admin123)');
  } else {
    console.log(`Using existing admin user: ${admin.email}`);
  }

  // 2. Check if this quiz already exists (idempotent)
  const existing = await Quiz.findOne({
    title: 'General Knowledge Trivia',
    isOfficial: true
  });

  if (existing) {
    console.log('Quiz "General Knowledge Trivia" already exists – skipping.');
    await mongoose.disconnect();
    return;
  }

  // 3. Create the quiz
  const quiz = new Quiz({
    moderatorId: admin._id,
    title: 'General Knowledge Trivia',
    description: 'A fun mix of multiple-choice and true/false questions covering geography, science, art, and more!',
    category: 'General Knowledge',
    tags: ['trivia', 'general-knowledge', 'geography', 'science', 'art'],
    isPublished: true,
    isOfficial: true,
    publishedAt: new Date(),
    playCount: 0
  });
  await quiz.save();

  // 4. Create questions
  const questions = [
    // Q1 – Multiple Choice
    {
      quizId: quiz._id,
      type: 'multiple-choice',
      text: 'What is the capital city of Australia?',
      timeLimit: 30,
      points: 1000,
      order: 1,
      answers: [
        { text: 'Sydney', isCorrect: false, order: 0 },
        { text: 'Melbourne', isCorrect: false, order: 1 },
        { text: 'Canberra', isCorrect: true, order: 2 },
        { text: 'Brisbane', isCorrect: false, order: 3 }
      ]
    },
    // Q2 – True/False
    {
      quizId: quiz._id,
      type: 'true-false',
      text: 'The Great Wall of China is visible from space with the naked eye.',
      timeLimit: 20,
      points: 1000,
      order: 2,
      answers: [
        { text: 'True', isCorrect: false, order: 0 },
        { text: 'False', isCorrect: true, order: 1 }
      ]
    },
    // Q3 – Multiple Choice
    {
      quizId: quiz._id,
      type: 'multiple-choice',
      text: 'Which planet in our solar system is known as the "Red Planet"?',
      timeLimit: 30,
      points: 1000,
      order: 3,
      answers: [
        { text: 'Venus', isCorrect: false, order: 0 },
        { text: 'Mars', isCorrect: true, order: 1 },
        { text: 'Jupiter', isCorrect: false, order: 2 },
        { text: 'Saturn', isCorrect: false, order: 3 }
      ]
    },
    // Q4 – True/False
    {
      quizId: quiz._id,
      type: 'true-false',
      text: 'Sharks are mammals.',
      timeLimit: 20,
      points: 1000,
      order: 4,
      answers: [
        { text: 'True', isCorrect: false, order: 0 },
        { text: 'False', isCorrect: true, order: 1 }
      ]
    },
    // Q5 – Multiple Choice
    {
      quizId: quiz._id,
      type: 'multiple-choice',
      text: 'Who painted the famous artwork "The Starry Night"?',
      timeLimit: 30,
      points: 1000,
      order: 5,
      answers: [
        { text: 'Pablo Picasso', isCorrect: false, order: 0 },
        { text: 'Leonardo da Vinci', isCorrect: false, order: 1 },
        { text: 'Vincent van Gogh', isCorrect: true, order: 2 },
        { text: 'Claude Monet', isCorrect: false, order: 3 }
      ]
    },
    // Q6 – True/False
    {
      quizId: quiz._id,
      type: 'true-false',
      text: 'The Amazon River is longer than the Nile River.',
      timeLimit: 20,
      points: 1000,
      order: 6,
      answers: [
        { text: 'True', isCorrect: false, order: 0 },
        { text: 'False', isCorrect: true, order: 1 }
      ]
    },
    // Q7 – Multiple Choice
    {
      quizId: quiz._id,
      type: 'multiple-choice',
      text: 'What is the smallest country in the world by land area?',
      timeLimit: 30,
      points: 1000,
      order: 7,
      answers: [
        { text: 'Monaco', isCorrect: false, order: 0 },
        { text: 'Vatican City', isCorrect: true, order: 1 },
        { text: 'San Marino', isCorrect: false, order: 2 },
        { text: 'Liechtenstein', isCorrect: false, order: 3 }
      ]
    },
    // Q8 – True/False
    {
      quizId: quiz._id,
      type: 'true-false',
      text: 'Penguins can be found in the Arctic.',
      timeLimit: 20,
      points: 1000,
      order: 8,
      answers: [
        { text: 'True', isCorrect: false, order: 0 },
        { text: 'False', isCorrect: true, order: 1 }
      ]
    },
    // Q9 – Multiple Choice
    {
      quizId: quiz._id,
      type: 'multiple-choice',
      text: 'How many strings does a standard guitar have?',
      timeLimit: 30,
      points: 1000,
      order: 9,
      answers: [
        { text: '4', isCorrect: false, order: 0 },
        { text: '5', isCorrect: false, order: 1 },
        { text: '6', isCorrect: true, order: 2 },
        { text: '7', isCorrect: false, order: 3 }
      ]
    },
    // Q10 – True/False
    {
      quizId: quiz._id,
      type: 'true-false',
      text: 'Honey never spoils and can last indefinitely if stored properly.',
      timeLimit: 20,
      points: 1000,
      order: 10,
      answers: [
        { text: 'True', isCorrect: true, order: 0 },
        { text: 'False', isCorrect: false, order: 1 }
      ]
    }
  ];

  const savedQuestions = [];
  for (const qData of questions) {
    const q = new Question(qData);
    await q.save();
    savedQuestions.push(q);
  }

  // 5. Link questions to quiz
  quiz.questions = savedQuestions.map(q => q._id);
  await quiz.save();

  console.log(`\nSeeded quiz: "${quiz.title}"`);
  console.log(`  ID:        ${quiz._id}`);
  console.log(`  Questions: ${savedQuestions.length}`);
  console.log(`  Published: true (official)`);
  console.log(`  Tags:      ${quiz.tags.join(', ')}`);
  console.log('\nDone! The quiz is now visible in the library.');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
