import React, { useRef, useState, useEffect } from 'react';
    import { checkHandwriting } from '../services/geminiService';
    import { WritingResult } from '../types';
    import { PenTool, Eraser, Check, RotateCcw } from 'lucide-react';
    
    const WritingPractice: React.FC = () => {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const [isDrawing, setIsDrawing] = useState(false);
      const [targetChar, setTargetChar] = useState('爱'); // Default target
      const [result, setResult] = useState<WritingResult | null>(null);
      const [loading, setLoading] = useState(false);
    
      useEffect(() => {
        clearCanvas();
      }, [targetChar]);
    
      const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      };
    
      const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      };
    
      const stopDrawing = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        ctx?.closePath();
        setIsDrawing(false);
      };
    
      const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
        }
        
        const rect = canvas.getBoundingClientRect();
        return {
          offsetX: clientX - rect.left,
          offsetY: clientY - rect.top
        };
      };
    
      const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          // Draw Guide lines
          if (ctx) {
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        setResult(null);
      };
    
      const handleSubmit = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
    
        // Create a temporary canvas to add white background (Gemini doesn't like transparent PNGs sometimes)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
            tCtx.fillStyle = 'white';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(canvas, 0, 0);
        }
    
        const imageBase64 = tempCanvas.toDataURL('image/png');
        setLoading(true);
        const res = await checkHandwriting(imageBase64, targetChar);
        setResult(res);
        setLoading(false);
      };
    
      const characters = ['爱', '家', '猫', '水', '火', '月'];
    
      return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full border-b-8 border-orange-200">
            <h2 className="text-3xl font-cute text-orange-500 mb-4 flex items-center gap-2">
              <PenTool className="w-8 h-8" /> 写汉字 (Writing)
            </h2>
    
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
              {characters.map(char => (
                <button
                  key={char}
                  onClick={() => setTargetChar(char)}
                  className={`flex-shrink-0 w-12 h-12 rounded-xl text-xl font-bold flex items-center justify-center transition-all ${
                    targetChar === char ? 'bg-orange-500 text-white shadow-lg scale-110' : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {char}
                </button>
              ))}
            </div>
    
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                 {/* Reference Character Faded Background */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <span className="text-[200px] font-brush text-black">{targetChar}</span>
                 </div>
    
                 <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    className="bg-white border-4 border-dashed border-gray-300 rounded-2xl cursor-crosshair touch-none shadow-inner"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                 />
              </div>
    
              <div className="flex gap-4 w-full justify-center max-w-xs">
                <button
                  onClick={clearCanvas}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" /> Clear
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Checking...' : <><Check className="w-5 h-5" /> Check</>}
                </button>
              </div>
            </div>
    
            {result && (
              <div className={`mt-6 p-6 rounded-2xl animate-fade-in ${result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xl">Score: {result.score}/10</span>
                  {result.isCorrect ? <span className="text-4xl">🌟</span> : <span className="text-4xl">💪</span>}
                </div>
                <p className="font-medium text-lg">{result.feedback}</p>
              </div>
            )}
          </div>
        </div>
      );
    };
    
    export default WritingPractice;
