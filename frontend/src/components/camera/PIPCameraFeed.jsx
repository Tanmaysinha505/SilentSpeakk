import React, { useRef, useState, useEffect } from 'react';
import { Camera, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { inBrowserHandDetector, classifyHandGesture } from '../../services/handDetector';
import { gestureProcessor } from '../../services/gestureProcessor';
import { cursorController } from '../../services/cursorController';
import { useAgent44Store } from '../../store/useAgent44Store';

const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17]             // Palm base
];

export function PIPCameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [hasHand, setHasHand] = useState(false);
  const tracking = useAgent44Store((s) => s.tracking);

  useEffect(() => {
    let stream = null;
    let isRunning = true;
    let animFrame = null;
    let ws = null;

    const startCamera = async () => {
      try {
        // 1. Initialize MediaPipe GPU Landmarker
        await inBrowserHandDetector.init();
        useAgent44Store.getState().updateTracking({ cameraActive: true });

        // 2. Open User Webcam
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
            audio: false
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().catch(() => {});
              startLoop();
            };
          }
        }
      } catch (e) {
        console.warn('PIP camera stream error:', e);
      }
    };

    const startLoop = () => {
      const loop = () => {
        if (!isRunning) return;
        const now = performance.now();
        const video = videoRef.current;

        if (video && video.readyState >= 2) {
          if (!inBrowserHandDetector.isReady && !inBrowserHandDetector.isInitializing) {
            inBrowserHandDetector.init().catch(() => {});
          }

          if (inBrowserHandDetector.isReady) {
            useAgent44Store.getState().updateTracking({ cameraActive: true });
            const results = inBrowserHandDetector.detectVideoFrame(video, now);

            if (results && results.landmarks && results.landmarks.length > 0) {
              setHasHand(true);
              if (showSkeleton) {
                drawSkeletons(results.landmarks);
              } else {
                clearCanvas();
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

              // Update cursor controller with index fingertip coordinate
              if (bestHandLms[8]) {
                cursorController.updateFromLandmark(bestHandLms[8]);
              }

              gestureProcessor.processFrame(bestGesture.gesture, bestGesture.confidence, bestHandLms, 30);
            } else {
              setHasHand(false);
              clearCanvas();
              gestureProcessor.processFrame('NONE', 0, [], 30);
            }
          }
        }

        animFrame = requestAnimationFrame(loop);
      };
      animFrame = requestAnimationFrame(loop);
    };

    // 3. Connect WebSocket to Python backend as fallback telemetry stream
    const connectTelemetry = () => {
      try {
        const wsUrl = `ws://${window.location.hostname || '127.0.0.1'}:8000/ws/telemetry`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry') {
              useAgent44Store.getState().updateTracking({ cameraActive: true });
              const hands = data.hands || [];
              const rawGesture = data.gesture || 'NONE';
              const confidence = data.confidence || 0;
              const lms = hands.length > 0 ? hands[0].landmarks || [] : [];
              if (lms.length > 0) {
                if (showSkeleton) drawSkeletons([lms]);
                if (lms[8]) cursorController.updateFromLandmark(lms[8]);
                setHasHand(true);
              }
              gestureProcessor.processFrame(rawGesture, confidence, lms, 30);
            }
          } catch (e) {}
        };
      } catch (e) {}
    };

    startCamera();
    connectTelemetry();

    return () => {
      isRunning = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ws) ws.close();
    };
  }, [showSkeleton]);

  const drawSkeletons = (hands) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const lms of hands) {
      if (!lms || lms.length < 21) continue;

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.9)';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;

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

      for (let i = 0; i < lms.length; i++) {
        const p = lms[i];
        const isFingertip = [4, 8, 12, 16, 20].includes(i);
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, isFingertip ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isFingertip ? '#10b981' : '#ffffff';
        ctx.fill();
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
    <div className={`pip-camera-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="pip-header">
        <div className="pip-title">
          <Camera size={13} className="text-cyan" />
          <span>LIVE HAND SENSOR</span>
          <span className={`pip-status-dot ${hasHand ? 'active' : ''}`} />
        </div>
        <div className="pip-controls">
          <button
            className="pip-btn"
            onClick={() => setShowSkeleton(!showSkeleton)}
            title={showSkeleton ? 'Hide Hand Skeleton' : 'Show Hand Skeleton'}
          >
            {showSkeleton ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            className="pip-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Camera' : 'Minimize Camera'}
          >
            {isMinimized ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="pip-video-wrapper">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="pip-video-element"
          />
          <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className="pip-skeleton-canvas"
          />
          <div className="pip-gesture-badge">
            {tracking.confirmedGesture !== 'NONE' ? tracking.confirmedGesture : 'TRACKING'}
          </div>
        </div>
      )}
    </div>
  );
}
