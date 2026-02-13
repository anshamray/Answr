import React, { useState } from 'react';
import { PixelButton } from './components/PixelButton';
import { PixelCard } from './components/PixelCard';
import { PixelBadge } from './components/PixelBadge';
import { PixelInput } from './components/PixelInput';
import { PixelLogo, PixelStar, PixelLightning, PixelUsers, PixelCheck, PixelClock } from './components/PixelIcons';
import { Sparkles, Zap, Users, Trophy, Play, Plus, Settings } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'home' | 'join' | 'host' | 'quiz'>('home');
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b-[3px] border-black bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <PixelLogo className="text-primary" size={36} />
              <span className="text-2xl font-bold text-primary pixel-font">Answr</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <button className="font-medium text-foreground hover:text-primary transition-colors">Features</button>
              <button className="font-medium text-foreground hover:text-primary transition-colors">Pricing</button>
              <button className="font-medium text-foreground hover:text-primary transition-colors">Docs</button>
            </div>
            
            <div className="flex items-center gap-3">
              <PixelButton variant="outline" size="sm" onClick={() => setActiveView('join')}>
                Join Game
              </PixelButton>
              <PixelButton variant="primary" size="sm" onClick={() => setActiveView('host')}>
                <Plus className="inline mr-1" size={16} />
                Host Quiz
              </PixelButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Content based on active view */}
      {activeView === 'home' && <HomeView setActiveView={setActiveView} />}
      {activeView === 'join' && <JoinView setActiveView={setActiveView} />}
      {activeView === 'host' && <HostView setActiveView={setActiveView} />}
      {activeView === 'quiz' && <QuizView setActiveView={setActiveView} />}
    </div>
  );
}

function HomeView({ setActiveView }: { setActiveView: (view: 'home' | 'join' | 'host' | 'quiz') => void }) {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-b-[3px] border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2">
                <PixelBadge variant="accent">
                  <Sparkles className="inline mr-1" size={12} />
                  Open Source
                </PixelBadge>
                <PixelBadge variant="secondary">
                  v2.0
                </PixelBadge>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Live Quizzes,
                <br />
                <span className="text-primary">Level Up</span> the
                <br />
                <span className="text-secondary">Energy</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                Real-time multiplayer quiz platform for classrooms, teams, and communities. 
                Create, host, and play engaging quizzes that feel like a game.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <PixelButton variant="primary" size="lg" onClick={() => setActiveView('host')}>
                  <Zap className="inline mr-2" size={20} />
                  Host a Quiz
                </PixelButton>
                <PixelButton variant="secondary" size="lg" onClick={() => setActiveView('join')}>
                  <Play className="inline mr-2" size={20} />
                  Join with PIN
                </PixelButton>
              </div>
              
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-primary">500K+</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="w-px h-12 bg-border"></div>
                <div>
                  <div className="text-3xl font-bold text-secondary">2M+</div>
                  <div className="text-sm text-muted-foreground">Quizzes Played</div>
                </div>
                <div className="w-px h-12 bg-border"></div>
                <div>
                  <div className="text-3xl font-bold text-accent">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>
            
            {/* Hero Illustration */}
            <div className="relative">
              <PixelCard variant="primary" className="transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="pixel-font text-sm text-primary">QUESTION 5/10</span>
                    <PixelClock className="text-accent" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold">What's the capital of France?</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-primary/20 border-2 border-primary font-medium cursor-pointer hover:bg-primary/30 transition-colors">
                      🗼 Paris
                    </div>
                    <div className="p-4 bg-white border-2 border-border font-medium cursor-pointer hover:bg-muted transition-colors">
                      🌊 London
                    </div>
                    <div className="p-4 bg-white border-2 border-border font-medium cursor-pointer hover:bg-muted transition-colors">
                      🍕 Rome
                    </div>
                    <div className="p-4 bg-white border-2 border-border font-medium cursor-pointer hover:bg-muted transition-colors">
                      🥨 Berlin
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <PixelUsers size={20} />
                      <span className="font-medium">48 players</span>
                    </div>
                    <div className="text-muted-foreground">15s remaining</div>
                  </div>
                </div>
              </PixelCard>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 animate-bounce">
                <PixelStar className="text-warning" size={48} />
              </div>
              <div className="absolute -bottom-4 -left-4 animate-pulse">
                <PixelLightning className="text-accent" size={36} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Pixel pattern decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-primary via-secondary to-accent opacity-50"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 border-b-[3px] border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <PixelBadge variant="primary" className="mb-4">
              <Sparkles className="inline mr-1" size={12} />
              Features
            </PixelBadge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-primary">Engage</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for educators, trainers, and teams who want to make learning interactive and fun
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PixelCard className="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-primary/20 flex items-center justify-center">
                <PixelLightning className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold">Real-Time Play</h3>
              <p className="text-muted-foreground">
                Lightning-fast responses with WebSocket technology. Everyone plays together, in perfect sync.
              </p>
            </PixelCard>
            
            <PixelCard className="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-secondary/20 flex items-center justify-center">
                <Users className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold">Unlimited Players</h3>
              <p className="text-muted-foreground">
                Scale from 5 to 5,000 players. Perfect for classrooms, conferences, or company-wide events.
              </p>
            </PixelCard>
            
            <PixelCard className="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-accent/20 flex items-center justify-center">
                <Sparkles className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold">Rich Media</h3>
              <p className="text-muted-foreground">
                Add images, GIFs, videos, and emojis to your questions. Make every quiz visually engaging.
              </p>
            </PixelCard>
            
            <PixelCard className="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-success/20 flex items-center justify-center">
                <Trophy className="text-success" size={32} />
              </div>
              <h3 className="text-xl font-bold">Live Leaderboard</h3>
              <p className="text-muted-foreground">
                Dynamic scoring based on speed and accuracy. Watch the competition heat up in real-time.
              </p>
            </PixelCard>
            
            <PixelCard className="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-warning/20 flex items-center justify-center">
                <PixelCheck className="text-warning" size={32} />
              </div>
              <h3 className="text-xl font-bold">Question Types</h3>
              <p className="text-muted-foreground">
                Multiple choice, true/false, short answer, and more. Flexibility for every learning style.
              </p>
            </PixelCard>
            
            <PixelCard className="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
              <div className="w-12 h-12 bg-primary/20 flex items-center justify-center">
                <Settings className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold">Full Control</h3>
              <p className="text-muted-foreground">
                Self-hosted or cloud. Your data, your rules. Open source and fully customizable.
              </p>
            </PixelCard>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-secondary/5 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <PixelBadge variant="secondary" className="mb-4">
              <Zap className="inline mr-1" size={12} />
              How It Works
            </PixelBadge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Three Steps to <span className="text-secondary">Epic Quizzes</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
                1
              </div>
              <h3 className="text-2xl font-bold">Create Your Quiz</h3>
              <p className="text-muted-foreground">
                Build your quiz in minutes with our intuitive editor. Add questions, set timers, customize scoring.
              </p>
            </div>
            
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
                2
              </div>
              <h3 className="text-2xl font-bold">Share the PIN</h3>
              <p className="text-muted-foreground">
                Get a unique 6-digit PIN. Players join from any device in seconds. No accounts required.
              </p>
            </div>
            
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
                3
              </div>
              <h3 className="text-2xl font-bold">Play & Compete</h3>
              <p className="text-muted-foreground">
                Launch the game and watch the excitement unfold. Real-time answers, instant feedback, live leaderboard.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <PixelButton variant="primary" size="lg" onClick={() => setActiveView('host')}>
              Start Creating
            </PixelButton>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 border-t-[3px] border-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <PixelCard variant="primary" className="space-y-6">
            <PixelStar className="text-primary mx-auto" size={64} />
            <h2 className="text-4xl lg:text-5xl font-bold">
              Ready to Transform Your Quizzes?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of educators and teams using Answr to make learning engaging, 
              collaborative, and fun.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <PixelButton variant="primary" size="lg" onClick={() => setActiveView('host')}>
                Get Started Free
              </PixelButton>
              <PixelButton variant="outline" size="lg">
                View on GitHub
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-[3px] border-black bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PixelLogo className="text-primary" size={32} />
                <span className="text-xl font-bold pixel-font text-primary">Answr</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Open-source quiz platform for modern teams and classrooms.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-3">Product</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-primary cursor-pointer">Features</div>
                <div className="hover:text-primary cursor-pointer">Pricing</div>
                <div className="hover:text-primary cursor-pointer">Roadmap</div>
                <div className="hover:text-primary cursor-pointer">Changelog</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-3">Resources</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-primary cursor-pointer">Documentation</div>
                <div className="hover:text-primary cursor-pointer">API Reference</div>
                <div className="hover:text-primary cursor-pointer">Community</div>
                <div className="hover:text-primary cursor-pointer">GitHub</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-3">Company</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="hover:text-primary cursor-pointer">About</div>
                <div className="hover:text-primary cursor-pointer">Blog</div>
                <div className="hover:text-primary cursor-pointer">Privacy</div>
                <div className="hover:text-primary cursor-pointer">Terms</div>
              </div>
            </div>
          </div>
          
          <div className="border-t-2 border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 Answr. Open source under MIT License. Built with 💜 for educators everywhere.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

function JoinView({ setActiveView }: { setActiveView: (view: 'home' | 'join' | 'host' | 'quiz') => void }) {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-secondary/10 via-primary/5 to-background">
      <div className="w-full max-w-md">
        <PixelCard className="space-y-6">
          <button 
            onClick={() => setActiveView('home')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to home
          </button>
          
          <div className="text-center space-y-2">
            <PixelLogo className="text-primary mx-auto mb-4" size={48} />
            <h2 className="text-3xl font-bold">Join a Quiz</h2>
            <p className="text-muted-foreground">
              Enter the 6-digit PIN from your host
            </p>
          </div>
          
          <div className="space-y-4">
            <PixelInput
              label="Game PIN"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl font-bold tracking-wider"
            />
            
            <PixelInput
              label="Your Nickname"
              type="text"
              placeholder="Enter your name"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            
            <PixelButton 
              variant="secondary" 
              className="w-full"
              disabled={pin.length !== 6 || nickname.length < 2}
              onClick={() => setActiveView('quiz')}
            >
              <Play className="inline mr-2" size={20} />
              Join Game
            </PixelButton>
          </div>
          
          <div className="pt-4 border-t-2 border-border">
            <p className="text-sm text-center text-muted-foreground">
              No account needed • Play from any device
            </p>
          </div>
        </PixelCard>
        
        {/* Recent Games */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground text-center">
            Recent Games
          </h3>
          <div className="grid gap-3">
            <button className="p-4 bg-white border-2 border-border hover:border-secondary transition-colors text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Geography Quiz</div>
                  <div className="text-sm text-muted-foreground">PIN: 847291 • 32 players</div>
                </div>
                <PixelUsers className="text-secondary" size={24} />
              </div>
            </button>
            <button className="p-4 bg-white border-2 border-border hover:border-secondary transition-colors text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Science Trivia</div>
                  <div className="text-sm text-muted-foreground">PIN: 652048 • 18 players</div>
                </div>
                <PixelUsers className="text-secondary" size={24} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HostView({ setActiveView }: { setActiveView: (view: 'home' | 'join' | 'host' | 'quiz') => void }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button 
              onClick={() => setActiveView('home')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors mb-4 inline-block"
            >
              ← Back to home
            </button>
            <h2 className="text-4xl font-bold mb-2">Create a Quiz</h2>
            <p className="text-muted-foreground">Build an engaging quiz in minutes</p>
          </div>
          
          <PixelButton variant="primary" onClick={() => setActiveView('quiz')}>
            <Play className="inline mr-2" size={20} />
            Start Quiz
          </PixelButton>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quiz Settings */}
          <div className="lg:col-span-1 space-y-6">
            <PixelCard className="space-y-4">
              <h3 className="font-bold text-lg">Quiz Settings</h3>
              
              <PixelInput
                label="Quiz Title"
                placeholder="My Awesome Quiz"
              />
              
              <div className="space-y-2">
                <label className="font-medium text-foreground">Category</label>
                <select className="w-full px-4 py-3 border-[3px] border-black bg-white text-foreground focus:outline-none focus:ring-4 focus:ring-primary/30">
                  <option>Geography</option>
                  <option>Science</option>
                  <option>History</option>
                  <option>Pop Culture</option>
                  <option>Custom</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="font-medium text-foreground">Time per Question</label>
                <select className="w-full px-4 py-3 border-[3px] border-black bg-white text-foreground focus:outline-none focus:ring-4 focus:ring-primary/30">
                  <option>10 seconds</option>
                  <option>20 seconds</option>
                  <option>30 seconds</option>
                  <option>60 seconds</option>
                  <option>No limit</option>
                </select>
              </div>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                  <span className="text-sm">Show leaderboard</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" defaultChecked />
                  <span className="text-sm">Randomize questions</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5" />
                  <span className="text-sm">Allow late joins</span>
                </label>
              </div>
            </PixelCard>
            
            <PixelCard variant="primary" className="space-y-3">
              <div className="flex items-center gap-2">
                <PixelStar className="text-primary" size={24} />
                <h4 className="font-bold">Pro Tip</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Add images to your questions for 2x more engagement! Visual questions keep players focused and excited.
              </p>
            </PixelCard>
          </div>
          
          {/* Questions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Questions (3)</h3>
              <PixelButton variant="accent" size="sm">
                <Plus className="inline mr-1" size={16} />
                Add Question
              </PixelButton>
            </div>
            
            {/* Question 1 */}
            <PixelCard variant="primary" className="space-y-4">
              <div className="flex items-center justify-between">
                <PixelBadge variant="primary">Question 1</PixelBadge>
                <button className="text-sm text-muted-foreground hover:text-destructive">
                  Delete
                </button>
              </div>
              
              <PixelInput
                placeholder="Enter your question..."
                defaultValue="What is the capital of France?"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <input 
                    className="w-full px-4 py-3 border-[3px] border-success bg-success/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-success/30"
                    placeholder="Answer 1 (Correct)"
                    defaultValue="Paris"
                  />
                  <div className="flex items-center gap-2">
                    <PixelCheck className="text-success" size={16} />
                    <span className="text-xs text-success font-medium">Correct Answer</span>
                  </div>
                </div>
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 2"
                  defaultValue="London"
                />
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 3"
                  defaultValue="Berlin"
                />
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 4"
                  defaultValue="Madrid"
                />
              </div>
            </PixelCard>
            
            {/* Question 2 */}
            <PixelCard variant="secondary" className="space-y-4">
              <div className="flex items-center justify-between">
                <PixelBadge variant="secondary">Question 2</PixelBadge>
                <button className="text-sm text-muted-foreground hover:text-destructive">
                  Delete
                </button>
              </div>
              
              <PixelInput
                placeholder="Enter your question..."
                defaultValue="Which planet is known as the Red Planet?"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 1"
                  defaultValue="Venus"
                />
                <div className="space-y-2">
                  <input 
                    className="w-full px-4 py-3 border-[3px] border-success bg-success/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-success/30"
                    placeholder="Answer 2 (Correct)"
                    defaultValue="Mars"
                  />
                  <div className="flex items-center gap-2">
                    <PixelCheck className="text-success" size={16} />
                    <span className="text-xs text-success font-medium">Correct Answer</span>
                  </div>
                </div>
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 3"
                  defaultValue="Jupiter"
                />
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 4"
                  defaultValue="Saturn"
                />
              </div>
            </PixelCard>
            
            {/* Question 3 */}
            <PixelCard variant="accent" className="space-y-4">
              <div className="flex items-center justify-between">
                <PixelBadge variant="accent">Question 3</PixelBadge>
                <button className="text-sm text-muted-foreground hover:text-destructive">
                  Delete
                </button>
              </div>
              
              <PixelInput
                placeholder="Enter your question..."
                defaultValue="What year did World War II end?"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 1"
                  defaultValue="1943"
                />
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 2"
                  defaultValue="1944"
                />
                <div className="space-y-2">
                  <input 
                    className="w-full px-4 py-3 border-[3px] border-success bg-success/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-success/30"
                    placeholder="Answer 3 (Correct)"
                    defaultValue="1945"
                  />
                  <div className="flex items-center gap-2">
                    <PixelCheck className="text-success" size={16} />
                    <span className="text-xs text-success font-medium">Correct Answer</span>
                  </div>
                </div>
                <input 
                  className="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30"
                  placeholder="Answer 4"
                  defaultValue="1946"
                />
              </div>
            </PixelCard>
            
            <button className="w-full py-8 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary font-medium">
              <Plus className="inline mr-2" size={20} />
              Add Another Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizView({ setActiveView }: { setActiveView: (view: 'home' | 'join' | 'host' | 'quiz') => void }) {
  const [timeLeft, setTimeLeft] = useState(18);
  
  React.useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Quiz Header */}
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => setActiveView('home')}
            className="text-sm text-foreground/70 hover:text-primary transition-colors"
          >
            ← Exit Quiz
          </button>
          
          <div className="flex items-center gap-4">
            <PixelBadge variant="secondary">
              <PixelUsers className="inline mr-1" size={12} />
              48 Players
            </PixelBadge>
            <PixelBadge variant="warning">
              <Trophy className="inline mr-1" size={12} />
              Round 2/5
            </PixelBadge>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Card */}
            <PixelCard className="space-y-6">
              <div className="flex items-center justify-between">
                <PixelBadge variant="primary">Question 5/10</PixelBadge>
                <div className={`flex items-center gap-2 px-4 py-2 border-2 border-black ${
                  timeLeft > 10 ? 'bg-success' : timeLeft > 5 ? 'bg-warning' : 'bg-destructive'
                } text-white font-bold animate-pulse`}>
                  <PixelClock size={20} />
                  {timeLeft}s
                </div>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                What's the capital of France?
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button className="group relative p-6 bg-gradient-to-br from-primary to-primary-dark text-white border-[3px] border-black pixel-shadow hover:transform hover:-translate-y-1 hover:pixel-shadow-lg transition-all duration-200 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">🗼 Paris</span>
                    <div className="w-8 h-8 border-2 border-white rounded-full group-hover:bg-white group-hover:border-white transition-all"></div>
                  </div>
                </button>
                
                <button className="group relative p-6 bg-gradient-to-br from-secondary to-secondary-dark text-white border-[3px] border-black pixel-shadow hover:transform hover:-translate-y-1 hover:pixel-shadow-lg transition-all duration-200 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">🌊 London</span>
                    <div className="w-8 h-8 border-2 border-white rounded-full group-hover:bg-white group-hover:border-white transition-all"></div>
                  </div>
                </button>
                
                <button className="group relative p-6 bg-gradient-to-br from-accent to-accent-dark text-white border-[3px] border-black pixel-shadow hover:transform hover:-translate-y-1 hover:pixel-shadow-lg transition-all duration-200 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">🍕 Rome</span>
                    <div className="w-8 h-8 border-2 border-white rounded-full group-hover:bg-white group-hover:border-white transition-all"></div>
                  </div>
                </button>
                
                <button className="group relative p-6 bg-gradient-to-br from-warning to-warning/80 text-warning-foreground border-[3px] border-black pixel-shadow hover:transform hover:-translate-y-1 hover:pixel-shadow-lg transition-all duration-200 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">🥨 Berlin</span>
                    <div className="w-8 h-8 border-2 border-foreground rounded-full group-hover:bg-foreground transition-all"></div>
                  </div>
                </button>
              </div>
            </PixelCard>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <PixelCard variant="primary" className="text-center">
                <div className="text-3xl font-bold text-primary">42</div>
                <div className="text-sm text-muted-foreground">Answered</div>
              </PixelCard>
              <PixelCard variant="secondary" className="text-center">
                <div className="text-3xl font-bold text-secondary">6</div>
                <div className="text-sm text-muted-foreground">Waiting</div>
              </PixelCard>
              <PixelCard variant="accent" className="text-center">
                <div className="text-3xl font-bold text-accent">87%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </PixelCard>
            </div>
          </div>
          
          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <PixelCard className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-warning" size={24} />
                <h3 className="font-bold text-lg">Leaderboard</h3>
              </div>
              
              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Sarah K.', score: 8750, avatar: '👑' },
                  { rank: 2, name: 'Mike R.', score: 8200, avatar: '🔥' },
                  { rank: 3, name: 'Emma L.', score: 7900, avatar: '⭐' },
                  { rank: 4, name: 'James P.', score: 7650, avatar: '💪' },
                  { rank: 5, name: 'Lisa M.', score: 7400, avatar: '🎯' },
                  { rank: 6, name: 'Alex T.', score: 7100, avatar: '🚀' },
                  { rank: 7, name: 'Chris W.', score: 6850, avatar: '⚡' },
                  { rank: 8, name: 'Maya S.', score: 6600, avatar: '💎' }
                ].map((player) => (
                  <div 
                    key={player.rank}
                    className={`flex items-center gap-3 p-3 border-2 ${
                      player.rank === 1 ? 'border-warning bg-warning/10' :
                      player.rank === 2 ? 'border-muted-foreground/30 bg-muted-foreground/5' :
                      player.rank === 3 ? 'border-accent/30 bg-accent/5' :
                      'border-border bg-white'
                    } transition-all hover:transform hover:-translate-x-1`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold border-2 border-black ${
                      player.rank === 1 ? 'bg-warning text-warning-foreground' :
                      player.rank === 2 ? 'bg-muted-foreground text-white' :
                      player.rank === 3 ? 'bg-accent text-accent-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {player.rank}
                    </div>
                    <span className="text-2xl">{player.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{player.name}</div>
                      <div className="text-sm text-muted-foreground">{player.score.toLocaleString()} pts</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t-2 border-border text-center">
                <button className="text-sm text-primary hover:underline font-medium">
                  View Full Leaderboard →
                </button>
              </div>
            </PixelCard>
          </div>
        </div>
      </div>
    </div>
  );
}
