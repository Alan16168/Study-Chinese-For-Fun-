import React, { useState } from 'react';
import { AppMode } from './types';
import StoryQuiz from './components/StoryQuiz';
import MagicFlashcards from './components/MagicFlashcards';
import WritingPractice from './components/WritingPractice';
import SpeakingBuddy from './components/SpeakingBuddy';
import { BookOpen, Mic, Headphones, PenTool, Home } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LISTENING:
        return <StoryQuiz />;
      case AppMode.SPEAKING:
        return <SpeakingBuddy />;
      case AppMode.READING:
        return <MagicFlashcards />;
      case AppMode.WRITING:
        return <WritingPractice />;
      default:
        return <HomeMenu setMode={setMode} />;
    }
  };

  return (
    <div className="min-h-screen pb-10 bg-panda-bg font-body selection:bg-yellow-200">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => setMode(AppMode.HOME)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-4xl">🐼</span>
            <h1 className="text-2xl md:text-3xl font-cute text-panda-dark font-bold tracking-wide">
              趣学中文 <span className="text-panda-primary">Fun Chinese</span>
            </h1>
          </button>
          
          {mode !== AppMode.HOME && (
             <button 
               onClick={() => setMode(AppMode.HOME)}
               className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
             >
               <Home className="text-gray-600" />
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mt-8 animate-fade-in px-2">
        {renderContent()}
      </main>
      
      {/* Footer / Decor */}
      <footer className="fixed bottom-0 left-0 w-full p-2 bg-white/80 backdrop-blur-sm text-center text-xs text-gray-400">
        Powered by Gemini • Designed for Learning
      </footer>
    </div>
  );
};

interface HomeMenuProps {
  setMode: (mode: AppMode) => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ setMode }) => {
  const cards = [
    {
      mode: AppMode.LISTENING,
      title: '听力 (Listening)',
      icon: <Headphones className="w-12 h-12 text-white" />,
      color: 'bg-blue-400',
      shadow: 'shadow-blue-200',
      desc: 'Listen to fun stories'
    },
    {
      mode: AppMode.SPEAKING,
      title: '口语 (Speaking)',
      icon: <Mic className="w-12 h-12 text-white" />,
      color: 'bg-red-400',
      shadow: 'shadow-red-200',
      desc: 'Talk to Panda'
    },
    {
      mode: AppMode.READING,
      title: '阅读 (Reading)',
      icon: <BookOpen className="w-12 h-12 text-white" />,
      color: 'bg-green-400',
      shadow: 'shadow-green-200',
      desc: 'Magic flashcards'
    },
    {
      mode: AppMode.WRITING,
      title: '写作 (Writing)',
      icon: <PenTool className="w-12 h-12 text-white" />,
      color: 'bg-orange-400',
      shadow: 'shadow-orange-200',
      desc: 'Practice drawing Hanzi'
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-10 space-y-2">
        <h2 className="text-3xl font-cute text-gray-700">Hello! 你好! 👋</h2>
        <p className="text-gray-500 text-lg">What do you want to practice today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <button
            key={card.mode}
            onClick={() => setMode(card.mode)}
            className={`${card.color} ${card.shadow} rounded-3xl p-6 h-48 flex items-center justify-between shadow-xl transform transition-all hover:scale-105 hover:shadow-2xl group relative overflow-hidden`}
          >
            <div className="relative z-10 text-left">
              <h3 className="text-2xl font-bold text-white font-cute mb-2">{card.title}</h3>
              <p className="text-white/90 font-medium">{card.desc}</p>
            </div>
            
            <div className="relative z-10 bg-white/20 p-4 rounded-full backdrop-blur-sm">
              {card.icon}
            </div>

            {/* Decor Circles */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute top-10 left-10 w-10 h-10 bg-white/10 rounded-full" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;
