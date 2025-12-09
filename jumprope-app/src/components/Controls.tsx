import React from 'react';
import clsx from 'clsx';

interface ControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onToggleCamera: () => void;
  count: number;
  timeLeft: number;
}

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onStart,
  onStop,
  onReset,
  onToggleCamera,
  count,
  timeLeft
}) => {
  return (
    <div className="absolute bottom-0 left-0 w-full p-6 pb-12 flex flex-col items-center bg-gradient-to-t from-black/80 to-transparent">
      {/* Stats Display */}
      <div className="flex w-full justify-between mb-8 px-4">
         <div className="flex flex-col items-center">
            <span className="text-gray-300 text-sm">Jumps</span>
            <span className="text-6xl font-bold text-white font-mono">{count}</span>
         </div>
         <div className="flex flex-col items-center">
            <span className="text-gray-300 text-sm">Time</span>
            <span className={clsx("text-6xl font-bold font-mono", timeLeft < 10 ? "text-red-500" : "text-white")}>
                {timeLeft}s
            </span>
         </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-6 items-center">
        {!isRunning ? (
             <button
                onClick={onStart}
                className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
             >
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[20px] border-l-white border-b-[10px] border-b-transparent ml-2"></div>
             </button>
        ) : (
            <button
                onClick={onStop}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
             >
                <div className="w-8 h-8 bg-white rounded-sm"></div>
             </button>
        )}

        <button
            onClick={onReset}
            className="w-12 h-12 rounded-full bg-gray-700/80 text-white flex items-center justify-center backdrop-blur-sm"
            aria-label="Reset"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 5v7h7" /></svg>
        </button>

        <button
            onClick={onToggleCamera}
            className="w-12 h-12 rounded-full bg-gray-700/80 text-white flex items-center justify-center backdrop-blur-sm"
            aria-label="Switch Camera"
        >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/><path d="M20 7v3.5"/></svg>
        </button>
      </div>
    </div>
  );
};
