import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { useWindowSize } from 'react-use';

interface CameraProps {
  onLandmarks: (landmarks: any) => void;
  isRunning: boolean;
  facingMode: 'user' | 'environment';
}

export const Camera: React.FC<CameraProps> = ({ onLandmarks, isRunning, facingMode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const { width, height } = useWindowSize();

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "/wasm" // Local WASM path
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });

        setLandmarker(poseLandmarker);
        console.log("MediaPipe initialized");
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    initMediaPipe();
  }, []);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      if (!videoRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    startCamera();

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Processing Loop
  const predict = useCallback(() => {
    if (landmarker && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.currentTime > 0 && !video.paused && !video.ended) {
        // Prepare canvas matching video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Detect
        const startTimeMs = performance.now();
        const result = landmarker.detectForVideo(video, startTimeMs);

        // Draw and Emit
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result.landmarks && result.landmarks.length > 0) {
            // Emit to parent
            onLandmarks(result.landmarks[0]);

            // Draw visualization
            const drawingUtils = new DrawingUtils(ctx);
            drawingUtils.drawLandmarks(result.landmarks[0], {
              radius: (data) => DrawingUtils.lerp(data.from!.z!, -0.15, 0.1, 5, 1),
              color: 'white',
              lineWidth: 1
            });
            drawingUtils.drawConnectors(result.landmarks[0], PoseLandmarker.POSE_CONNECTIONS, {
                color: 'white',
                lineWidth: 2
            });
          }
        }
      }
    }

    if (isRunning) {
      requestRef.current = requestAnimationFrame(predict);
    }
  }, [landmarker, isRunning, onLandmarks]);

  useEffect(() => {
    if (isRunning && landmarker) {
      requestRef.current = requestAnimationFrame(predict);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isRunning, landmarker, predict]);


  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
        <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"
            playsInline
            muted
            // Mirroring the video for user experience if using front camera
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
    </div>
  );
};
