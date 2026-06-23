"use client";

import { useEffect, useRef, useState } from "react";
import { DynamicFrame } from "@/types/frame";

interface BoothCanvasProps {
  currentFrame: DynamicFrame | null;
  capturedPhotos: HTMLCanvasElement[];
  videoElement: HTMLVideoElement | null;
  activeFilter: string;
  onSlotsDetected: (count: number) => void;
  activeSlotIndex: number;
}

interface DetectedSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function BoothCanvas({
  currentFrame,
  capturedPhotos,
  videoElement,
  activeFilter,
  onSlotsDetected,
  activeSlotIndex,
}: BoothCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameImageRef = useRef<HTMLImageElement | null>(null);
  const [isFrameLoaded, setIsFrameLoaded] = useState(false);
  const [detectedSlots, setDetectedSlots] = useState<DetectedSlot[]>([]);

  // 1. CACHING TEMPLATE & DETEKSI LUBANG INSTAN VIA DATA URL / BASE64
  useEffect(() => {
    if (!currentFrame?.src) {
      setIsFrameLoaded(false);
      setDetectedSlots([]);
      return;
    }

    const img = new Image();
    img.src = currentFrame.src;
    img.crossOrigin = "anonymous"; // Bypass restriksi CORS browser
    
    img.onload = () => {
      frameImageRef.current = img;
      setIsFrameLoaded(true);

      const scanCanvas = document.createElement("canvas");
      const scanWidth = img.naturalWidth || 600;
      const scanHeight = img.naturalHeight || 900;
      scanCanvas.width = scanWidth;
      scanCanvas.height = scanHeight;
      
      const scanCtx = scanCanvas.getContext("2d", { willReadFrequently: true });
      if (!scanCtx) return;

      scanCtx.drawImage(img, 0, 0);
      
      try {
        const imgData = scanCtx.getImageData(0, 0, scanWidth, scanHeight);
        const pixels = imgData.data;
        const computedSlots: DetectedSlot[] = [];
        const visited = new Uint8Array(scanWidth * scanHeight);

        // Scan piksel cepat dengan lompatan 6 piksel demi performa real-time
        const step = 6;
        for (let y = 0; y < scanHeight; y += step) {
          for (let x = 0; x < scanWidth; x += step) {
            const idx = (y * scanWidth + x) * 4;
            const alpha = pixels[idx + 3]; // Cek channel transparansi (Alpha)

            if (alpha < 15 && !visited[y * scanWidth + x]) {
              let minX = x, maxX = x;
              let minY = y, maxY = y;

              for (let sy = y; sy < Math.min(y + 400, scanHeight); sy += step) {
                let foundInRow = false;
                for (let sx = Math.max(0, x - 100); sx < Math.min(x + 500, scanWidth); sx += step) {
                  const sIdx = (sy * scanWidth + sx) * 4;
                  if (pixels[sIdx + 3] < 15) {
                    if (sx < minX) minX = sx;
                    if (sx > maxX) maxX = sx;
                    if (sy > maxY) maxY = sy;
                    foundInRow = true;
                    visited[sy * scanWidth + sx] = 1;
                  }
                }
                if (!foundInRow && sy > y + 30) break;
              }

              const w = maxX - minX;
              const h = maxY - minY;

              if (w > 50 && h > 50) {
                computedSlots.push({ x: minX, y: minY, w, h });
              }
            }
          }
        }

        computedSlots.sort((a, b) => a.y - b.y);
        setDetectedSlots(computedSlots);
        onSlotsDetected(computedSlots.length || 3);

      } catch (err) {
        console.error("Gagal mendeteksi lubang otomatis:", err);
        setDetectedSlots([]);
        onSlotsDetected(3);
      }
    };
  }, [currentFrame?.src, onSlotsDetected]);

  // 2. HIGH-PERFORMANCE RENDER LOOP LAYER COMPOSTING
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const renderLoop = () => {
      const canvasWidth = frameImageRef.current?.naturalWidth || 600;
      const canvasHeight = frameImageRef.current?.naturalHeight || 900;
      
      if (canvas.width !== canvasWidth) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }

      // Bersihkan background canvas dengan warna dasar kertas warm cream
      ctx.fillStyle = "#FDFBF7";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 🌟 TENTUKAN KOORDINAT SLOT (SISTEM PENGAMAN MUTLAK)
      let slots: any[] = [];

      if (detectedSlots.length === 0) {
        // BYPASS: Jika deteksi piksel transparan zonk/0, langsung paksa pakai koordinat cetak Koran lo!
        slots = [
          { xPct: 39.5, yPct: 43.6, wPct: 53.0, hPct: 22.0 }, // Slot Tengah Besar Utama
          { xPct: 7.6,  yPct: 68.3, wPct: 27.5, hPct: 14.8 }, // Slot Bawah Kiri
          { xPct: 65.0, yPct: 68.3, wPct: 27.5, hPct: 14.8 }, // Slot Bawah Kanan
        ];
      } else {
        // Jika sukses mendeteksi lubang transparan (pada frame lain), ubah pixel ke persentase canvas aktual
        slots = detectedSlots.map(slot => ({
          xPct: (slot.x / canvasWidth) * 100,
          yPct: (slot.y / canvasHeight) * 100,
          wPct: (slot.w / canvasWidth) * 100,
          hPct: (slot.h / canvasHeight) * 100
        }));
      }

      // Komposisikan penempatan foto ke tiap koordinat slot yang aktif
      slots.forEach((slot, index) => {
        const x = (slot.xPct / 100) * canvasWidth;
        const y = (slot.yPct / 100) * canvasHeight;
        const w = (slot.wPct / 100) * canvasWidth;
        const h = (slot.hPct / 100) * canvasHeight;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip(); // Masking pangkas area luar kotak slot

        // RUMUS OBJECT-FIT COVER MATEMATIS (FOTO DIJAMIN PROPORSIONAL & TIDAK GEPENG)
        const drawCover = (source: HTMLCanvasElement | HTMLVideoElement, isMirror: boolean) => {
          const sWidth = (source instanceof HTMLVideoElement) ? source.videoWidth : source.width;
          const sHeight = (source instanceof HTMLVideoElement) ? source.videoHeight : source.height;

          if (!sWidth || !sHeight) return;

          const sRatio = sWidth / sHeight;
          const tRatio = w / h;

          let dx, dy, dWidth, dHeight;

          if (sRatio > tRatio) {
            dHeight = h;
            dWidth = h * sRatio;
            dx = x + (w - dWidth) / 2;
            dy = y;
          } else {
            dWidth = w;
            dHeight = w / sRatio;
            dx = x;
            dy = y + (h - dHeight) / 2;
          }

          ctx.save();
          ctx.filter = applyToneFilter(activeFilter);

          if (isMirror) {
            // Mirroring tepat di poros tengah slot masing-masing
            ctx.translate(x + w / 2, y + h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(x + w / 2), -(y + h / 2));
          }

          ctx.drawImage(source, 0, 0, sWidth, sHeight, dx, dy, dWidth, dHeight);
          ctx.restore();
        };

        if (capturedPhotos[index]) {
          // Layer A: Tampilkan hasil foto statis jika sudah dijepret
          drawCover(capturedPhotos[index], false);
        } else if (index === activeSlotIndex && videoElement && videoElement.readyState >= 2) {
          // Layer B: Tampilkan live capture mirror jika slot aktif membidik kamera
          drawCover(videoElement, true);
        } else {
          // Layer C: Sesi standby box kosong sebelum dijepret
          ctx.fillStyle = "#FAF6EE";
          ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
      });

      // LAYER OVERLAY BINGKAI: Selalu gambar bingkai cetakan di lapisan paling atas
      if (frameImageRef.current && isFrameLoaded) {
        ctx.drawImage(frameImageRef.current, 0, 0, canvasWidth, canvasHeight);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [capturedPhotos, videoElement, activeFilter, activeSlotIndex, isFrameLoaded, detectedSlots]);

  function applyToneFilter(filter: string) {
    if (filter === "grayscale") return "grayscale(100%) contrast(1.15)";
    if (filter === "vintage") return "sepia(35%) contrast(0.95) saturate(1.1)";
    return "none";
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        id="boombooth-core-canvas"
        className="w-full h-auto rounded-2xl shadow-md border border-[#EFEBE1] transform-gpu"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}