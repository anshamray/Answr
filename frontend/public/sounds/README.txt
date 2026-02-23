Sound Files for Answr Gamification
===================================

IMPORTANT: Sounds are for MODERATOR-ONLY use.
Players in the same room would have overlapping sounds which is distracting.
Only the quiz host/moderator screen should play sounds.

Status: Planned for future implementation.

Required sound files (MP3 format, short clips ~1-2 seconds):

1. correct.mp3    - Played when correct answer is revealed (cheerful ding)
2. wrong.mp3      - Played when many players got it wrong (sad buzzer)
3. streak.mp3     - Played when a player achieves a streak (fire swoosh)
4. tick.mp3       - Played each second during final countdown (clock tick)
5. game-over.mp3  - Played when quiz ends (victory fanfare)
6. join.mp3       - Played when player joins lobby (pop sound)
7. countdown.mp3  - Played during 3-2-1-GO countdown (countdown beep)

Integration points (GameControlPage.vue):
- Play tick.mp3 when timeRemaining <= 5
- Play join.mp3 on lobby:update with new players
- Play correct.mp3/wrong.mp3 on game:questionEnd
- Play game-over.mp3 when game ends

Recommended sources for royalty-free sounds:
- freesound.org
- pixabay.com/sound-effects
- mixkit.co/free-sound-effects

Tips:
- Keep files small (<100KB each) for fast loading
- Normalize volume levels across all files
- Use MP3 format for best browser compatibility
