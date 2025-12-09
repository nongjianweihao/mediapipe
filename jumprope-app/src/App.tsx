import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera } from './components/Camera';
import { Controls } from './components/Controls';
import { JumpCounter } from './logic/JumpCounter';
import { useInterval } from 'react-use';
import clsx from 'clsx';

// App State Machine
enum AppState {
    IDLE = 'IDLE',
    POSITIONING = 'POSITIONING',
    COUNTDOWN = 'COUNTDOWN',
    RUNNING = 'RUNNING',
    FINISHED = 'FINISHED'
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute default
  const [countdownValue, setCountdownValue] = useState(3);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [feedback, setFeedback] = useState<string>('');

  const counterRef = useRef<JumpCounter>(new JumpCounter());
  const lastCountRef = useRef<number>(0);
  const positioningTimeRef = useRef<number>(0); // Time spent in correct position

  // Voice Feedback
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Handle Landmarks from Camera
  const handleLandmarks = useCallback((landmarks: any) => {
    // 1. Positioning State
    if (appState === AppState.POSITIONING) {
        const isReady = counterRef.current.isReady(landmarks);

        if (isReady) {
            // If ready, increment persistence timer
            if (positioningTimeRef.current === 0) {
                 positioningTimeRef.current = Date.now();
            } else if (Date.now() - positioningTimeRef.current > 1000) {
                 // Held position for 1 second -> Start Countdown
                 setAppState(AppState.COUNTDOWN);
                 setCountdownValue(3);
                 speak("3");
                 positioningTimeRef.current = 0;
            }
            setFeedback("保持住... (Hold)");
        } else {
            // Reset timer if lost position
            positioningTimeRef.current = 0;
            setFeedback("请全身入镜 (Stand in frame)");
        }
    }

    // 2. Running State
    if (appState === AppState.RUNNING) {
        const result = counterRef.current.process(landmarks);

        if (result.count !== lastCountRef.current) {
            setCount(result.count);
            lastCountRef.current = result.count;

            if (result.count > 0 && result.count % 10 === 0) {
                setFeedback("坚持! (Keep going!)");
                speak(result.count.toString());
                setTimeout(() => setFeedback(""), 1000);
            }
        }
    }
  }, [appState, speak]);

  // Handle User Actions
  const handleStart = () => {
    setAppState(AppState.POSITIONING);
    speak("请站在屏幕中间，全身入镜");
    setCount(0);
    lastCountRef.current = 0;
    counterRef.current.reset();
  };

  const handleStop = () => {
    setAppState(AppState.FINISHED);
    speak("停止. 共 " + count + "个");
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setCount(0);
    setTimeLeft(60);
    lastCountRef.current = 0;
    counterRef.current.reset();
  };

  const handleToggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Countdown Logic (3..2..1)
  useInterval(() => {
    if (appState === AppState.COUNTDOWN) {
        if (countdownValue > 1) {
            const next = countdownValue - 1;
            setCountdownValue(next);
            speak(next.toString());
        } else {
            setAppState(AppState.RUNNING);
            speak("开始!");
        }
    }
  }, appState === AppState.COUNTDOWN ? 1000 : null);

  // Game Timer Logic (60s)
  useInterval(() => {
    if (appState === AppState.RUNNING && timeLeft > 0) {
        const nextTime = timeLeft - 1;
        setTimeLeft(nextTime);

        if (nextTime === 10) speak("还有十秒");
        if (nextTime === 0) {
            handleStop();
            speak("时间到");
        }
    }
  }, appState === AppState.RUNNING ? 1000 : null);

  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden">

      {/* Camera Layer */}
      <div className="absolute inset-0 z-0">
         <Camera
            onLandmarks={handleLandmarks}
            isRunning={true}
            facingMode={facingMode}
         />
      </div>

      {/* Overlays based on State */}

      {/* Positioning Instruction */}
      {appState === AppState.POSITIONING && (
         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="border-4 border-dashed border-yellow-400 w-3/4 h-3/4 rounded-3xl animate-pulse flex items-center justify-center">
                 {/* Visual Guide Box */}
            </div>
            <div className="absolute top-1/4 text-2xl font-bold bg-black/60 px-6 py-2 rounded-full">
                {feedback || "请站在框内"}
            </div>
         </div>
      )}

      {/* Countdown Display */}
      {appState === AppState.COUNTDOWN && (
         <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20">
            <span className="text-[10rem] font-black text-white drop-shadow-2xl animate-ping">
                {countdownValue}
            </span>
         </div>
      )}

      {/* In-Game Feedback (Good Job, etc) */}
      {appState === AppState.RUNNING && feedback && (
         <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <span className="text-5xl font-black text-yellow-400 drop-shadow-lg whitespace-nowrap">{feedback}</span>
         </div>
      )}

      {/* Finished State Overlay */}
      {appState === AppState.FINISHED && (
         <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <h2 className="text-4xl font-bold mb-4">时间到!</h2>
            <div className="text-8xl font-black text-yellow-400 mb-8">{count}</div>
            <div className="text-xl text-gray-300 mb-12">本次成绩</div>

            <button
                onClick={handleReset}
                className="bg-white text-black px-8 py-4 rounded-full font-bold text-xl hover:bg-gray-200 transition"
            >
                再来一次
            </button>
         </div>
      )}

      {/* Controls Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="pointer-events-auto w-full h-full">
            <Controls
                isRunning={appState === AppState.RUNNING}
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
