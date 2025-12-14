import React, { useEffect, useRef, useState } from 'react';
import { createLiveSession } from '../services/geminiService';
import { Mic, MicOff, Volume2, Radio } from 'lucide-react';
import { LiveServerMessage } from '@google/genai';

// Live API Audio Utils
const pcmToWav = (pcmData: Int16Array, sampleRate: number) => {
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length * 2, true);
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }
  return buffer;
};

const SpeakingBuddy: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(0); // For visualization
  
  // Refs for Audio Contexts and Processors
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleConnect = async () => {
    if (isConnected) {
        handleDisconnect();
        return;
    }

    try {
      // 1. Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect Live API
      sessionPromiseRef.current = createLiveSession(
        () => {
           console.log("Connection Open");
           setIsConnected(true);
           startAudioStreaming(stream);
        },
        handleServerMessage,
        () => {
            console.log("Connection Closed");
            setIsConnected(false);
            cleanupAudio();
        },
        (err) => {
            console.error("Connection Error", err);
            setIsConnected(false);
            cleanupAudio();
        }
      );
    } catch (error) {
      console.error("Setup failed", error);
    }
  };

  const startAudioStreaming = (stream: MediaStream) => {
    if (!inputAudioContextRef.current) return;
    
    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
    const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;

    processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Calculate volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
            sum += Math.abs(inputData[i]);
        }
        setVolume(Math.min(100, (sum / inputData.length) * 500));

        // Create Blob for Gemini
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = inputData[i] * 32768;
        }
        
        // Base64 encode
        let binary = '';
        const len = int16.buffer.byteLength;
        const bytes = new Uint8Array(int16.buffer);
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                });
            });
        }
    };

    source.connect(processor);
    processor.connect(inputAudioContextRef.current.destination);
  };

  const handleServerMessage = async (message: LiveServerMessage) => {
    const serverContent = message.serverContent;
    if (!outputAudioContextRef.current) return;

    if (serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
        setIsTalking(true);
        const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
        
        // Decode
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert PCM to AudioBuffer manually since decodeAudioData expects file headers usually,
        // but here we construct it raw. 
        // Wait, the API returns raw PCM. We need to put it into an AudioBuffer.
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const audioCtx = outputAudioContextRef.current;
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for(let i=0; i<dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        
        // Scheduling
        const currentTime = audioCtx.currentTime;
        if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime;
        }
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += buffer.duration;
        
        sourcesRef.current.add(source);
        source.onended = () => {
            sourcesRef.current.delete(source);
            if (sourcesRef.current.size === 0) setIsTalking(false);
        };
    }

    if (serverContent?.interrupted) {
        // Clear queue
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        setIsTalking(false);
    }
  };

  const handleDisconnect = () => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close()); // LiveClient doesn't have close, but assuming underlying WebSocket does or we just stop sending. 
        // Actually the SDK `connect` returns a session that might have close. 
        // If not, we just tear down audio.
    }
    cleanupAudio();
    setIsConnected(false);
  };

  const cleanupAudio = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  useEffect(() => {
    return () => {
        handleDisconnect();
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-xl w-full border-b-8 border-red-200">
        <h2 className="text-3xl font-cute text-red-500 mb-4 flex items-center gap-2">
           <Volume2 className="w-8 h-8" /> 熊猫语伴 (Panda Talk)
        </h2>
        <p className="text-gray-600 mb-6 text-lg">
          Talk to Panda Laoshi! Say "Ni Hao" (Hello) to start practicing.
        </p>

        <div className="flex flex-col items-center justify-center space-y-8 py-10">
            {/* Panda Avatar / Visualizer */}
            <div className={`relative w-48 h-48 rounded-full border-8 transition-all duration-300 flex items-center justify-center overflow-hidden
                ${isConnected ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-100'}
                ${isTalking ? 'scale-110 shadow-[0_0_30px_rgba(248,113,113,0.6)]' : ''}
            `}>
                <div className="text-8xl z-10 transition-transform duration-200" style={{ transform: `scale(${1 + volume / 200})` }}>
                    🐼
                </div>
                {isConnected && (
                     <div className="absolute inset-0 bg-red-200 opacity-20 animate-pulse rounded-full"></div>
                )}
            </div>

            {/* Status Text */}
            <div className="text-2xl font-cute text-gray-700 h-8">
                {isConnected ? (isTalking ? "Panda is talking..." : "Listening to you...") : "Ready to chat?"}
            </div>

            {/* Controls */}
            <button
                onClick={handleConnect}
                className={`flex items-center gap-3 px-8 py-4 rounded-full text-xl font-bold text-white shadow-xl transition-all transform active:scale-95
                    ${isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                `}
            >
                {isConnected ? (
                    <>
                        <MicOff className="w-6 h-6" /> Stop Talking
                    </>
                ) : (
                    <>
                        <Mic className="w-6 h-6" /> Start Chatting
                    </>
                )}
            </button>
            
            {isConnected && (
                 <div className="flex items-center gap-2 text-red-400 text-sm animate-pulse">
                    <Radio className="w-4 h-4" /> Live Connection Active
                </div>
            )}
        </div>
      </div>
      <div className="bg-yellow-50 p-4 rounded-xl border-l-4 border-yellow-400 text-yellow-800 text-sm">
        <strong>Tip:</strong> Make sure your microphone is allowed. Speak clearly!
      </div>
    </div>
  );
};

export default SpeakingBuddy;
