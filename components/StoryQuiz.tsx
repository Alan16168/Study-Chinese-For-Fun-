import React, { useState } from 'react';
import { generateStory } from '../services/geminiService';
import { Story } from '../types';
import { Headphones, Play, Pause, CheckCircle, XCircle } from 'lucide-react';

const StoryQuiz: React.FC = () => {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const handleNewStory = async () => {
    setLoading(true);
    setStory(null);
    setSelectedAnswer(null);
    setFeedback(null);
    setIsPlaying(false);
    
    // Stop any existing speech
    window.speechSynthesis.cancel();

    const data = await generateStory();
    setStory(data);
    setLoading(false);
  };

  const handleSpeak = () => {
    if (!story) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(story.content);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8; // Slower for kids
    utterance.onend = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleCheck = (option: string) => {
    if (!story) return;
    setSelectedAnswer(option);
    if (option === story.answer) {
      setFeedback('correct');
      // Confetti effect or sound could go here
    } else {
      setFeedback('incorrect');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-xl w-full border-b-8 border-blue-200">
        <h2 className="text-3xl font-cute text-blue-600 mb-4 flex items-center gap-2">
          <Headphones className="w-8 h-8" /> 听小故事 (Story Time)
        </h2>
        
        <button
          onClick={handleNewStory}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-cute text-2xl px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95"
        >
          {loading ? 'Writing Story...' : 'Tell me a story! 📖'}
        </button>
      </div>

      {story && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          {/* Story Card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-blue-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{story.title}</h3>
            
            <div className="bg-blue-50 p-6 rounded-2xl mb-6 relative">
              <p className="text-lg leading-loose text-gray-700 font-medium">
                {story.content}
              </p>
              <button
                onClick={handleSpeak}
                className="absolute -bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Quiz Card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-blue-100 flex flex-col justify-center">
            <h4 className="text-xl font-bold text-gray-700 mb-4">Question:</h4>
            <p className="text-lg text-blue-800 mb-6">{story.question}</p>
            
            <div className="space-y-3">
              {story.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCheck(option)}
                  disabled={feedback === 'correct'}
                  className={`w-full p-4 rounded-xl text-left text-lg font-medium transition-all border-2 ${
                    selectedAnswer === option
                      ? feedback === 'correct'
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : 'bg-red-100 border-red-500 text-red-800'
                      : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {selectedAnswer === option && feedback === 'correct' && <CheckCircle className="text-green-500" />}
                    {selectedAnswer === option && feedback === 'incorrect' && <XCircle className="text-red-500" />}
                  </div>
                </button>
              ))}
            </div>
            
            {feedback === 'correct' && (
              <div className="mt-4 text-center text-green-600 font-cute text-xl animate-bounce">
                🎉 Good job! You listened well!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryQuiz;
