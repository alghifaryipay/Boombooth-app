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

  // 1. OTOMATISASI SCANNER LUBANG (AKURASI TINGGI)
  useEffect(() => {
    if (!currentFrame?.src) {
      setIsFrameLoaded(false);
      setDetectedSlots([]);
      return;
    }

    const img = new Image();
    img.src = currentFrame.src;
    if (currentFrame.src.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    
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
        
        // 🌟 KUNCI PERBAIKAN: Step = 2. Akurasi sangat tinggi biar garis bingkai tipis gak kelompatan!
        const step = 2; 
        const cols = Math.floor(scanWidth / step);
        const rows = Math.floor(scanHeight / step);
        const visited = new Uint8Array(cols * rows);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (visited[r * cols + c]) continue;

            const pxX = c * step;
            const pxY = r * step;
            const idx = (pxY * scanWidth + pxX) * 4;
            const alpha = pixels[idx + 3];

            if (alpha < 10) { 
              let minX = pxX, maxX = pxX, minY = pxY, maxY = pxY;
              const queue: number[] = [c, r];
              visited[r * cols + c] = 1;

              let head = 0;
              while (head < queue.length) {
                const currC = queue[head++];
                const currR = queue[head++];
                
                const cx = currC * step;
                const cy = currR * step;

                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                const dC = [0, 0, -1, 1];
                const dR = [-1, 1, 0, 0];

                for (let i = 0; i < 4; i++) {
                  const nc = currC + dC[i];
                  const nr = currR + dR[i];

                  if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                    if (!visited[nr * cols + nc]) {
                      const nIdx = ((nr * step) * scanWidth + (nc * step)) * 4;
                      if (pixels[nIdx + 3] < 10) {
                        visited[nr * cols + nc] = 1;
                        queue.push(nc, nr);
                      }
                    }
                  }
                }
              }

              const w = maxX - minX;
              const h = maxY - minY;
              
              if (w > 20 && h > 20) {
                computedSlots.push({ x: minX, y: minY, w, h });
              }
            }
          }
        }

        const canvasArea = scanWidth * scanHeight;

        let validBlobs = computedSlots.filter(s => {
          const areaPct = (s.w * s.h) / canvasArea;
          return areaPct >= 0.015 && areaPct <= 0.85; // 1.5% sampai 85% layar
        });

        // Anti-Overlap (Hapus lubang palsu)
        validBlobs = validBlobs.filter((blob, i, arr) => {
          return !arr.some((other, j) => {
            if (i === j) return false;
            return blob.x >= other.x - 2 && blob.y >= other.y - 2 && 
                   (blob.x + blob.w) <= (other.x + other.w + 2) && 
                   (blob.y + blob.h) <= (other.y + other.h + 2) &&
                   (blob.w * blob.h < other.w * other.h);
          });
        });

        // Urutkan Rapi (Kiri ke Kanan, Atas ke Bawah)
        validBlobs.sort((a, b) => {
          if (Math.abs(a.y - b.y) < (Math.max(a.h, b.h) / 2)) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        setDetectedSlots(validBlobs);
        onSlotsDetected(validBlobs.length || 3);

      } catch (err) {
        console.error("Gagal mendeteksi lubang:", err);
        setDetectedSlots([]);
        onSlotsDetected(3);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFrame?.src]);

  // 2. RENDER LOOP COMPOSITION
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

      ctx.fillStyle = "#FDFBF7";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      let slots: any[] = [];
      const frameName = currentFrame?.name?.toLowerCase() || "";

      // SMART FALLBACK
      if (detectedSlots.length === 0) {
        if (frameName.includes("koran") || frameName.includes("inspirasi")) {
          slots = [
            { xPct: 39.5, yPct: 43.6, wPct: 53.0, hPct: 22.0 },
            { xPct: 7.6,  yPct: 68.3, wPct: 27.5, hPct: 14.8 },
            { xPct: 65.0, yPct: 68.3, wPct: 27.5, hPct: 14.8 },
          ];
        } else {
          const totalSlots = 3;
          const marginX = 8, startY = 10, endY = 85, gap = 3;     
          const hPct = ((endY - startY) - (gap * (totalSlots - 1))) / totalSlots;
          const wPct = 100 - (marginX * 2);

          for (let i = 0; i < totalSlots; i++) {
            slots.push({ xPct: marginX, yPct: startY + i * (hPct + gap), wPct, hPct });
          }
        }
      } else {
        slots = detectedSlots.map(slot => ({
          xPct: (slot.x / canvasWidth) * 100,
          yPct: (slot.y / canvasHeight) * 100,
          wPct: (slot.w / canvasWidth) * 100,
          hPct: (slot.h / canvasHeight) * 100
        }));
      }

      // LAYER FOTO (Di bawah bingkai)
      slots.forEach((slot, index) => {
        const x = (slot.xPct / 100) * canvasWidth;
        const y = (slot.yPct / 100) * canvasHeight;
        const w = (slot.wPct / 100) * canvasWidth;
        const h = (slot.hPct / 100) * canvasHeight;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip(); 

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
            ctx.translate(x + w / 2, y + h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(x + w / 2), -(y + h / 2));
          }

          ctx.drawImage(source, 0, 0, sWidth, sHeight, dx, dy, dWidth, dHeight);
          ctx.restore();
        };

        if (capturedPhotos[index]) {
          drawCover(capturedPhotos[index], false);
        } else if (index === activeSlotIndex && videoElement && videoElement.readyState >= 2) {
          drawCover(videoElement, true);
        } else {
          ctx.fillStyle = "rgba(234, 234, 234, 0.5)";
          ctx.fillRect(x, y, w, h);
        }
        
        ctx.restore();
      });

      // LAYER BINGKAI (Di atas menutupi sudut foto)
      if (frameImageRef.current && isFrameLoaded) {
        ctx.drawImage(frameImageRef.current, 0, 0, canvasWidth, canvasHeight);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => cancelAnimationFrame(animationFrameId);
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