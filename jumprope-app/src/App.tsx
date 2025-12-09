import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from './components/Camera';
import { Controls } from './components/Controls';
import { JumpCounter, JumpState } from './logic/JumpCounter';
import { useInterval } from 'react-use';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute default
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [feedback, setFeedback] = useState<string>('');

  const counterRef = useRef<JumpCounter>(new JumpCounter());
  const lastCountRef = useRef<number>(0);

  // Voice Feedback
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
        // Cancel current utterance
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // Chinese
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleLandmarks = useCallback((landmarks: any) => {
    if (!isRunning) return;

    const result = counterRef.current.process(landmarks);

    // Only update state if count changed to avoid excessive re-renders
    if (result.count !== lastCountRef.current) {
        setCount(result.count);
        lastCountRef.current = result.count;

        // Feedback every 10 jumps
        if (result.count > 0 && result.count % 10 === 0) {
            setFeedback("Great!");
            speak(result.count.toString());
            setTimeout(() => setFeedback(""), 1000);
        }
    }
  }, [isRunning, speak]);

  const handleStart = () => {
    setIsRunning(true);
    speak("开始");
  };

  const handleStop = () => {
    setIsRunning(false);
    speak("停止. " + count + "个");
  };

  const handleReset = () => {
    setIsRunning(false);
    setCount(0);
    setTimeLeft(60);
    lastCountRef.current = 0;
    counterRef.current.reset();
  };

  const handleToggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Timer Logic
  useInterval(() => {
    if (isRunning && timeLeft > 0) {
        setTimeLeft(timeLeft - 1);
        if (timeLeft === 11 || timeLeft === 6) {
             // Optional countdown warnings
        }
        if (timeLeft === 1) {
            handleStop();
            speak("时间到");
        }
    }
  }, 1000);

  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden">

      {/* Camera Layer */}
      <div className="absolute inset-0 z-0">
         <Camera
            onLandmarks={handleLandmarks}
            isRunning={true} // Camera always runs to show preview, but processing logic in handleLandmarks checks isRunning
            facingMode={facingMode}
         />
      </div>

      {/* Feedback Overlay */}
      {feedback && (
         <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <span className="text-6xl font-black text-yellow-400 drop-shadow-lg animate-bounce">{feedback}</span>
         </div>
      )}

      {/* Controls Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Enable pointer events only for controls */}
          <div className="pointer-events-auto w-full h-full">
            <Controls
                isRunning={isRunning}
                onStart={handleStart}
                onStop={handleStop}
                onReset={handleReset}
                onToggleCamera={handleToggleCamera}
                count={count}
                timeLeft={timeLeft}
            />
          </div>
      </div>
    </div>
  );
}

export default App;
