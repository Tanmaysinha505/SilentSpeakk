/**
 * AirOS Canvas Vision Visualizer
 * Renders 21-point hand skeleton, joint nodes, fingertip tracking trail,
 * presentation laser pointer, spotlight effects, and calibrated active region.
 */

const SKELETON_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17]              // Palm base
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

class VisionVisualizer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.showLandmarks = true;
    this.showActiveRegion = true;
    this.showCameraFeed = true;

    // Image buffer for direct canvas video rendering
    this.bgImage = new Image();

    // Trail buffer for fingertip
    this.trail = [];
    this.maxTrail = 16;

    // Laser & Spotlight animation state
    this.laserParticles = [];
    this.pulseAnim = 0;

    // Calibration active box (normalized 0-1)
    this.activeBox = { x1: 0.15, y1: 0.15, x2: 0.85, y2: 0.85 };
  }

  setCanvasSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setActiveRegion(x1, y1, x2, y2) {
    this.activeBox = { x1, y1, x2, y2 };
  }

  render(telemetry) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 0. Update and draw webcam frame directly onto canvas
    if (telemetry.image) {
      this.bgImage.src = `data:image/jpeg;base64,${telemetry.image}`;
    }

    ctx.clearRect(0, 0, w, h);
    this.pulseAnim += 0.05;

    if (this.showCameraFeed && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      // Draw webcam video of the user
      ctx.drawImage(this.bgImage, 0, 0, w, h);
      // Subtle glass dark tint for high contrast skeleton visibility
      ctx.fillStyle = 'rgba(8, 12, 20, 0.25)';
      ctx.fillRect(0, 0, w, h);
    } else {
      // Standby deep slate background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, w, h);
    }

    // 1. Draw Active Region Calibration Bounds
    if (this.showActiveRegion) {
      this.drawActiveRegion(w, h);
    }

    // 2. Render Hand Landmarks & Skeleton
    if (this.showLandmarks && telemetry.hands && telemetry.hands.length > 0) {
      for (const hand of telemetry.hands) {
        this.drawHand(hand, w, h);
      }
    }

    // 3. Render Virtual Laser Pointer if in presentation mode
    if (telemetry.laser_pos) {
      this.drawLaserPointer(telemetry.laser_pos[0] * w, telemetry.laser_pos[1] * h);
    }

    // 4. Render Spotlight Highlight Effect
    if (telemetry.spotlight && telemetry.laser_pos) {
      this.drawSpotlight(telemetry.laser_pos[0] * w, telemetry.laser_pos[1] * h);
    }
  }

  drawActiveRegion(w, h) {
    const ctx = this.ctx;
    const rx = this.activeBox.x1 * w;
    const ry = this.activeBox.y1 * h;
    const rw = (this.activeBox.x2 - this.activeBox.x1) * w;
    const rh = (this.activeBox.y2 - this.activeBox.y1) * h;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(rx, ry, rw, rh);

    // Corner crosshair markers
    const cSize = 12;
    ctx.setLineDash([]);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(rx, ry + cSize); ctx.lineTo(rx, ry); ctx.lineTo(rx + cSize, ry);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(rx + rw - cSize, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + cSize);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(rx + rw, ry + rh - cSize); ctx.lineTo(rx + rw, ry + rh); ctx.lineTo(rx + rw - cSize, ry + rh);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(rx + cSize, ry + rh); ctx.lineTo(rx, ry + rh); ctx.lineTo(rx, ry + rh - cSize);
    ctx.stroke();

    ctx.restore();
  }

  drawHand(hand, w, h) {
    const ctx = this.ctx;
    const lms = hand.landmarks;
    if (!lms || lms.length < 21) return;

    // Draw Skeleton Connections
    ctx.save();
    ctx.lineWidth = 3.0;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)'; // Electric purple bones
    ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
    ctx.shadowBlur = 8;

    for (const [i, j] of SKELETON_CONNECTIONS) {
      const p1 = lms[i];
      const p2 = lms[j];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
    ctx.restore();

    // Draw Landmark Nodes
    for (let i = 0; i < lms.length; i++) {
      const p = lms[i];
      const px = p.x * w;
      const py = p.y * h;
      const isTip = FINGERTIP_INDICES.includes(i);

      ctx.save();
      ctx.beginPath();
      if (isTip) {
        // Glowing cyan fingertip
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fill();

        // White core dot
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Add index tip to motion trail
        if (i === 8) {
          this.trail.push({ x: px, y: py, alpha: 1.0 });
          if (this.trail.length > this.maxTrail) this.trail.shift();
        }
      } else if (i === 0) {
        // Wrist anchor
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
      } else {
        // Knuckle joint
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Fingertip Particle Trail
    this.drawTrail();
  }

  drawTrail() {
    const ctx = this.ctx;
    if (this.trail.length < 2) return;

    ctx.save();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const p1 = this.trail[i];
      const p2 = this.trail[i + 1];
      const ratio = (i + 1) / this.trail.length;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(0, 240, 255, ${ratio * 0.7})`;
      ctx.lineWidth = ratio * 4.0;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLaserPointer(x, y) {
    const ctx = this.ctx;
    ctx.save();

    // Concentric pulsing rings
    const pulse = 10 + Math.sin(this.pulseAnim * 3) * 4;
    ctx.beginPath();
    ctx.arc(x, y, pulse + 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Laser core orb
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18;
    ctx.fill();

    // Center white spark
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  drawSpotlight(x, y) {
    const ctx = this.ctx;
    ctx.save();
    const radius = 90;

    // Glowing halo around spotlight
    const grad = ctx.createRadialGradient(x, y, 20, x, y, radius);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
    grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
