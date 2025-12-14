import React, { useState } from 'react';
import { generateFlashcard, generateIllustration } from '../services/geminiService';
import { Flashcard } from '../types';
import { Sparkles, ArrowRight, RefreshCw, Image as ImageIcon } from 'lucide-react';

const MagicFlashcards: React.FC = () => {
  const [topic, setTopic] = useState<string>('Animals');
  const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setFlashcard(null);
    const card = await generateFlashcard(topic);
    setFlashcard(card);
    setLoading(false);

    if (card) {
      setImageLoading(true);
      const img = await generateIllustration(card.word);
      if (img) {
        setFlashcard(prev => prev ? { ...prev, imageUrl: img } : null);
      }
      setImageLoading(false);
    }
  };

  const topics = ['Animals', 'Food', 'School', 'Family', 'Colors', 'Sports'];

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-xl w-full border-b-8 border-green-200">
        <h2 className="text-3xl font-cute text-green-600 mb-4 flex items-center gap-2">
          <Sparkles className="w-8 h-8" /> 魔法卡片 (Magic Cards)
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {topics.map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-4 py-2 rounded-full text-lg font-bold transition-all ${
                topic === t 
                  ? 'bg-green-500 text-white shadow-lg scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-green-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-cute text-2xl px-8 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="animate-spin" /> : 'Create Magic Card! ✨'}
        </button>
      </div>

      {loading && (
        <div className="animate-bounce text-2xl font-cute text-green-600">
          Panda is thinking... 🐼
        </div>
      )}

      {flashcard && (
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border-4 border-green-400 w-full max-w-md transform transition-all duration-500 hover:scale-[1.02]">
          <div className="aspect-square bg-gray-50 relative flex items-center justify-center overflow-hidden">
            {imageLoading ? (
              <div className="flex flex-col items-center text-gray-400 animate-pulse">
                <ImageIcon className="w-16 h-16 mb-2" />
                <span className="font-cute">Painting...</span>
              </div>
            ) : flashcard.imageUrl ? (
              <img src={flashcard.imageUrl} alt={flashcard.word} className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-300">No Image</div>
            )}
            
            <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
              {topic}
            </div>
          </div>

          <div className="p-6 text-center space-y-2">
            <h3 className="text-6xl font-brush text-gray-800 mb-2">{flashcard.word}</h3>
            <p className="text-2xl text-green-600 font-bold font-cute">{flashcard.pinyin}</p>
            <p className="text-xl text-gray-500">{flashcard.meaning}</p>
            <div className="mt-4 p-3 bg-green-50 rounded-xl">
              <p className="text-green-800 font-medium">{flashcard.exampleSentence}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicFlashcards;
