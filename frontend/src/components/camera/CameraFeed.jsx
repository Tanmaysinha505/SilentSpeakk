import React, { useRef, useEffect, useState } from 'react';
import { useAgent44Store } from '../../store/useAgent44Store';
import { gestureProcessor } from '../../services/gestureProcessor';
import { inBrowserHandDetector, classifyHandGesture } from '../../services/handDetector';
import { cursorController } from '../../services/cursorController';
import { RefreshCw } from 'lucide-react';

const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17]              // Palm base
];

export function CameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const showLandmarks = useAgent44Store((s) => s.tracking.showLandmarks);
  const updateTracking = useAgent44Store((s) => s.updateTracking);

  const [isLoading, setIsLoading] = useState(true);
  const [initStage, setInitStage] = useState('Starting Camera...');
  const animFrameRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let ws = null;
    let isRunning = true;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 30;

    const initAll = async () => {
      try {
        // 1. Initialize In-Browser MediaPipe Hand Landmarker
        setInitStage('Loading MediaPipe AI Model...');
        await inBrowserHandDetector.init();

        // 2. Acquire Browser Webcam
        setInitStage('Connecting Video Stream...');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            },
            audio: false
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().catch(() => {});
              setIsLoading(false);
              updateTracking({
                cameraActive: true,
                cameraInitializing: false,
                source: 'MediaPipe On-Device GPU'
              });

              // Start real-time detection animation loop
              startDetectionLoop();
            };
          }
        }
      } catch (err) {
        console.warn('Camera / MediaPipe setup error, trying fallback:', err);
        setIsLoading(false);
      }
    };

    // 3. Ultra-fast In-Browser Real-Time Frame Detection Loop
    const startDetectionLoop = () => {
      const detectLoop = () => {
        if (!isRunning) return;

        const now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 1000) {
          currentFps = Math.round((frameCount * 1000) / (now - lastFrameTime));
          frameCount = 0;
          lastFrameTime = now;
        }

        const video = videoRef.current;
        if (video && video.readyState >= 2 && inBrowserHandDetector.isReady) {
          // Detect hand landmarks on GPU
          const results = inBrowserHandDetector.detectVideoFrame(video, now);

          if (results && results.landmarks && results.landmarks.length > 0) {
            // Render skeletal mesh on canvas for all detected hands
            if (canvasRef.current && showLandmarks) {
              drawLandmarks(results.landmarks);
            }

            const activeMode = useAgent44Store.getState().activeMode;
            let bestGesture = { gesture: 'NONE', confidence: 0 };
            let bestHandLms = results.landmarks[0];

            for (const lms of results.landmarks) {
              const res = classifyHandGesture(lms, activeMode);
              if (res.gesture !== 'NONE' && res.confidence > bestGesture.confidence) {
                bestGesture = res;
                bestHandLms = lms;
              }
            }

            // Feed index fingertip into smooth cursor controller
            if (bestHandLms[8]) {
              cursorController.updateFromLandmark(bestHandLms[8]);
            }

            // Ingest into temporal smoothing & majority voting engine
            gestureProcessor.processFrame(bestGesture.gesture, bestGesture.confidence, bestHandLms, currentFps);
          } else {
            // No hand currently detected
            if (canvasRef.current) {
              clearCanvas();
            }
            gestureProcessor.processFrame('NONE', 0, [], currentFps);
          }
        }

        animFrameRef.current = requestAnimationFrame(detectLoop);
      };

      animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    // 4. Also connect WebSocket to Python backend if present (hybrid listener)
    const connectTelemetry = () => {
      try {
        const wsUrl = `ws://${window.location.hostname || '127.0.0.1'}:8000/ws/telemetry`;
        ws = new WebSocket(wsUrl);
        window.__agent44_ws = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry' && !inBrowserHandDetector.isReady) {
              const hands = data.hands || [];
              const rawGesture = data.gesture || 'NONE';
              const confidence = data.confidence || 0;
              const fps = data.fps || 30;

              const lms = hands.length > 0 ? hands[0].landmarks || [] : [];
              gestureProcessor.processFrame(rawGesture, confidence, lms, fps);
            }
          } catch (e) {}
        };
      } catch (e) {}
    };

    initAll();
    connectTelemetry();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (ws) {
        ws.close();
      }
    };
  }, [showLandmarks, updateTracking]);

  // Render 21-Point Skeletal Mesh
  const drawLandmarks = (handsLandmarks) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    for (const lms of handsLandmarks) {
      if (!lms || lms.length < 21) continue;

      // Draw glowing connection lines
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;

      for (const [i, j] of SKELETON_CONNECTIONS) {
        const p1 = lms[i];
        const p2 = lms[j];
        if (!p1 || !p2) continue;

        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Draw keypoints / joints
      for (let i = 0; i < lms.length; i++) {
        const p = lms[i];
        const isFingertip = [4, 8, 12, 16, 20].includes(i);
        const radius = isFingertip ? 7 : 4.5;

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, radius, 0, Math.PI * 2);
        ctx.fillStyle = isFingertip ? '#10b981' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = isFingertip ? '#00f3ff' : '#0ea5e9';
        ctx.stroke();
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="camera-viewport-container">
      {/* 1. Full Screen Live Video Feed */}
      <video
        ref={videoRef}
        className="fullscreen-camera-video"
        autoPlay
        playsInline
        muted
      />

      {/* 2. Transparent Landmark Tracking Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="fullscreen-landmark-canvas"
      />

      {/* 3. Initializing Agent 44 Splash (Auto Disappears when ready) */}
      {isLoading && (
        <div className="initializing-card">
          <div className="init-spinner">
            <RefreshCw size={28} className="animate-spin text-cyan" />
          </div>
          <h2 className="init-title">Initializing Agent 44...</h2>
          <p className="init-desc">{initStage}</p>
        </div>
      )}
    </div>
  );
}
