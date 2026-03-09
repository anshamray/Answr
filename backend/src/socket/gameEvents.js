/**
 * Game Event Broadcast Utilities
 * Helper functions to emit game events to session rooms
 */

import { GAME_EVENTS, LOBBY_EVENTS } from './events.js';

// Duration of the intro phase in milliseconds (3-2-1-Go!)
export const INTRO_DURATION = 3000;

/**
 * Broadcast an event to all clients in a session
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN (room name)
 * @param {string} event - Event name to emit
 * @param {Object} data - Data to send with the event
 */
export function broadcastToSession(io, sessionPin, event, data) {
  io.to(sessionPin).emit(event, data);
}

/**
 * Broadcast lobby update with current player list
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Array} players - Array of player objects { id, nickname, avatar }
 */
export function broadcastLobbyUpdate(io, sessionPin, players) {
  io.to(sessionPin).emit(LOBBY_EVENTS.UPDATE, {
    players,
    playerCount: players.length
  });
}

/**
 * Broadcast a question to all players
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Object} questionData - Question data { questionNumber, totalQuestions, text, options, timeLimit }
 */
export function broadcastQuestion(io, sessionPin, questionData) {
  io.to(sessionPin).emit(GAME_EVENTS.QUESTION, {
    questionId: questionData.questionId,
    questionNumber: questionData.questionNumber,
    totalQuestions: questionData.totalQuestions,
    text: questionData.text,
    type: questionData.type || 'multiple-choice',
    options: questionData.options,
    timeLimit: questionData.timeLimit,
    allowMultipleAnswers: questionData.allowMultipleAnswers || false,
    sliderConfig: questionData.sliderConfig || null,
    mediaUrl: questionData.mediaUrl || null
  });
}

/**
 * Broadcast question intro (signals start of intro countdown)
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Object} data - { questionNumber, totalQuestions }
 */
export function broadcastQuestionIntro(io, sessionPin, data) {
  io.to(sessionPin).emit(GAME_EVENTS.QUESTION_INTRO, {
    questionNumber: data.questionNumber,
    totalQuestions: data.totalQuestions
  });
}

/**
 * Broadcast question start (signals end of intro, show answers)
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 */
export function broadcastQuestionStart(io, sessionPin) {
  io.to(sessionPin).emit(GAME_EVENTS.QUESTION_START, {});
}

/**
 * Broadcast timer update
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {number} remaining - Remaining time in seconds
 */
export function broadcastTimer(io, sessionPin, remaining) {
  io.to(sessionPin).emit(GAME_EVENTS.TIMER, {
    remaining
  });
}

/**
 * Broadcast that a question has ended with the correct answer IDs
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Object} data - { correctAnswerIds: string[] }
 */
export function broadcastQuestionEnd(io, sessionPin, data) {
  io.to(sessionPin).emit(GAME_EVENTS.QUESTION_END, {
    correctAnswerIds: data?.correctAnswerIds || []
  });
}

/**
 * Broadcast leaderboard update
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Array} leaderboard - Array of player scores [{ nickname, score, position }]
 */
export function broadcastLeaderboard(io, sessionPin, leaderboard) {
  io.to(sessionPin).emit(GAME_EVENTS.LEADERBOARD, {
    leaderboard
  });
}

/**
 * Broadcast game end with final results
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Object} finalResults - Final game results { leaderboard, stats }
 */
export function broadcastGameEnd(io, sessionPin, finalResults) {
  io.to(sessionPin).emit(GAME_EVENTS.END, {
    leaderboard: finalResults.leaderboard,
    stats: finalResults.stats
  });
}
