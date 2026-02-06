# Claude AI Development Assistant Guide

This file contains instructions for Claude AI when assisting with the Answr project development.

## Project Context

**Kahood** is an open-source quiz platform being developed as a privacy-focused alternative to Kahoot. It's built for educational institutions, companies, and private use.

### Tech Stack
- **Frontend**: Svelte 4 + Vite
- **Backend**: Node.js + Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (optional for MVP)

### Key Features
- Real-time multiplayer quiz gameplay
- Moderator dashboard for quiz creation
- Word-based PIN codes for sessions
- Time-based scoring system
- Live leaderboards
- Responsive design (desktop + mobile)

## Project Structure

```
kahood/
├── backend/          # Node.js API + WebSocket server
│   └── src/
│       ├── server.js       # Main server file
│       ├── models/         # Mongoose schemas
│       ├── routes/         # REST API endpoints
│       ├── controllers/    # Business logic
│       └── utils/          # Helper functions
│
├── frontend/         # Svelte client application
│   └── src/
│       ├── App.svelte      # Main component
│       ├── lib/            # Services (socket, api)
│       ├── components/     # Reusable UI components
│       ├── routes/         # Pages/Views
│       └── stores/         # Svelte stores
│
└── docs/            # Documentation
    ├── Lastenheft (requirements spec)
    ├── Architektur.md
    └── QUICKSTART.md
```

## Development Guidelines

### When Writing Code

1. **Follow Existing Structure**
   - Place files in the correct directories
   - Use ES6+ module syntax (`import/export`)
   - Keep components small and focused

2. **Code Style**
   - Use 2 spaces for indentation
   - Use semicolons in JavaScript
   - Use meaningful variable/function names
   - Add comments for complex logic

3. **WebSocket Architecture**
   - One WebSocket connection per client
   - Use Socket.io rooms for session isolation
   - Each game session = one room
   - Format: `session-${sessionId}` for rooms

4. **Database Models**
   - Use Mongoose schemas
   - Include validation
   - Add timestamps (`createdAt`, `updatedAt`)
   - Reference related documents with ObjectIds

### Feature Prioritization

**MVP (Must-Have)**
- Moderator authentication
- Quiz CRUD operations
- Multiple-choice questions
- Session management with PINs
- Real-time gameplay
- Score calculation
- Leaderboard

**Version 1.1 (Should-Have)**
- Images in questions
- Variable time limits
- Advanced statistics
- Session pause/resume

**Future (Could-Have)**
- Additional question types
- Music/sound effects
- Quiz import/export

### Common Tasks

#### Adding a New API Endpoint
```javascript
// backend/src/routes/quizzes.js
import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Implementation
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### Adding a Svelte Component
```svelte
<!-- frontend/src/components/QuizCard.svelte -->
<script>
  export let quiz;
  export let onClick;
</script>

<style>
  /* Component styles */
</style>

<div class="quiz-card" on:click={onClick}>
  <h3>{quiz.title}</h3>
  <p>{quiz.description}</p>
</div>
```

#### WebSocket Event Handling
```javascript
// Server
socket.on('event-name', (data) => {
  // Process data
  io.to(`session-${sessionId}`).emit('response-event', result);
});

// Client
socket.emit('event-name', data);
socket.on('response-event', (result) => {
  // Handle response
});
```

### Database Schema Examples

```javascript
// Quiz Schema
{
  moderatorId: ObjectId,
  title: String,
  description: String,
  category: String,
  questions: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}

// Session Schema
{
  quizId: ObjectId,
  pin: String,              // word-based PIN
  status: String,           // 'waiting' | 'active' | 'finished'
  participants: [{
    playerId: String,
    name: String,
    avatar: String,
    score: Number
  }],
  currentQuestionIndex: Number,
  startedAt: Date
}

// Question Schema
{
  quizId: ObjectId,
  type: String,            // 'multiple-choice' | 'true-false'
  text: String,
  imageUrl: String,
  options: [{
    id: String,
    text: String,
    isCorrect: Boolean
  }],
  timeLimit: Number,
  order: Number
}
```

### WebSocket Event Naming Convention

**Client → Server**
- `join-game` - Player joins session
- `join-as-moderator` - Moderator joins session
- `start-question` - Moderator starts question
- `submit-answer` - Player submits answer
- `next-question` - Move to next question

**Server → Client**
- `new-question` - Broadcast new question
- `question-ended` - Time expired
- `answer-result` - Individual answer feedback
- `leaderboard` - Updated rankings
- `player-joined` - New player in lobby
- `game-finished` - Game ended

### Error Handling

**Backend**
```javascript
try {
  // Operation
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: error.message
  });
}
```

**Frontend**
```javascript
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('Request failed');
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
}
```

### Testing Checklist

When implementing features, ensure:
- [ ] Code runs without errors
- [ ] WebSocket events fire correctly
- [ ] Database operations succeed
- [ ] UI updates in real-time
- [ ] Mobile responsive
- [ ] Error handling in place
- [ ] Console has no warnings

### Common Pitfalls to Avoid

❌ **Don't:**
- Create separate WebSocket servers per game
- Store session state only in memory (use DB)
- Ignore WebSocket reconnection scenarios
- Hardcode configuration values
- Skip input validation
- Use console.log in production code

✅ **Do:**
- Use Socket.io rooms for session isolation
- Persist important data to MongoDB
- Handle reconnection gracefully
- Use environment variables for config
- Validate all user inputs
- Use proper logging (consider Winston)

### Debugging Tips

**Backend Issues**
```bash
# Check if server is running
curl http://localhost:3000

# Monitor WebSocket connections
# Add debug logging in socket.on('connection')
```

**Frontend Issues**
```javascript
// Check WebSocket connection
console.log('Socket connected:', socket.connected);
console.log('Socket ID:', socket.id);

// Monitor events
socket.onAny((event, ...args) => {
  console.log('Event:', event, args);
});
```

**Database Issues**
```javascript
// Check MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes, commit
git add .
git commit -m "feat: description"

# Push and create PR
git push origin feature/feature-name
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Build/config changes

## When Helping Developers

### Understanding Requests

1. **Clarify scope** - Is this MVP, v1.1, or future?
2. **Check dependencies** - What needs to exist first?
3. **Consider architecture** - Does it fit the design?

### Providing Solutions

1. **Explain the approach** before code
2. **Show file locations** clearly
3. **Include error handling**
4. **Add helpful comments**
5. **Suggest testing steps**

### Code Examples

- Use realistic data
- Show imports/exports
- Include error cases
- Match existing style
- Add inline comments for clarity

### Documentation

When creating docs:
- Use clear headings
- Include code examples
- Add diagrams if helpful
- Link to related docs
- Keep it concise

## Resources

- **Svelte Docs**: https://svelte.dev/docs
- **Socket.io Docs**: https://socket.io/docs/
- **Express Docs**: https://expressjs.com/
- **Mongoose Docs**: https://mongoosejs.com/docs/

## Project-Specific Notes

### PIN Generation
- Use word-based PINs (e.g., "happy-cat-42")
- Not number-based like Kahoot
- Easier to read and type
- Generate from word list + random number

### Scoring Algorithm
```javascript
const basePoints = 1000;
const timeBonus = (timeLimit - timeElapsed) / timeLimit;
const finalPoints = isCorrect ? Math.round(basePoints * timeBonus) : 0;
```

### Session Lifecycle
1. Moderator creates session → generates PIN
2. Players join lobby with PIN
3. Moderator starts game
4. Questions sent one by one
5. Answers collected in real-time
6. Results shown after each question
7. Final leaderboard at end

---

**Remember**: This is a learning project. Focus on:
- Clean, understandable code
- Good architecture
- Proper error handling
- User experience
- Documentation

Keep solutions practical and educational. Help developers understand *why*, not just *how*.
