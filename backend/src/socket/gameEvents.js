/**
 * Game Event Broadcast Utilities
 * Helper functions to emit game events to session rooms
 */

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
  io.to(sessionPin).emit('lobby:update', {
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
  io.to(sessionPin).emit('game:question', {
    questionNumber: questionData.questionNumber,
    totalQuestions: questionData.totalQuestions,
    text: questionData.text,
    options: questionData.options,
    timeLimit: questionData.timeLimit
  });
}

/**
 * Broadcast timer update
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {number} remaining - Remaining time in seconds
 */
export function broadcastTimer(io, sessionPin, remaining) {
  io.to(sessionPin).emit('game:timer', {
    remaining
  });
}

/**
 * Broadcast that a question has ended with the correct answer
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Object} correctAnswer - Correct answer data { optionIndex, optionText }
 */
export function broadcastQuestionEnd(io, sessionPin, correctAnswer) {
  io.to(sessionPin).emit('game:questionEnd', {
    correctAnswer
  });
}

/**
 * Broadcast leaderboard update
 * @param {Server} io - Socket.io server instance
 * @param {string} sessionPin - The session PIN
 * @param {Array} leaderboard - Array of player scores [{ nickname, score, position }]
 */
export function broadcastLeaderboard(io, sessionPin, leaderboard) {
  io.to(sessionPin).emit('game:leaderboard', {
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
  io.to(sessionPin).emit('game:end', {
    leaderboard: finalResults.leaderboard,
    stats: finalResults.stats
  });
}
