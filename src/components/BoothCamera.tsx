"use client";

import { useEffect, useRef } from "react";

interface BoothCameraProps {
  onCapture: (canvas: HTMLCanvasElement) => void;
  isCapturing: boolean;
  triggerSnap: boolean;
  onSnapDone: () => void;
}

export default function BoothCamera({ onCapture, triggerSnap, onSnapDone }: BoothCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Gunakan ref untuk melacak stream agar clean-up memori 100% instan tanpa jeda state
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function enableCamera() {
      try {
        // 🌟 OPTIMASI RESOLUSI: Kunci di 640x480 (Resolusi emas photobooth, ringan & instan)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: "user", // Mengutamakan kamera depan smartphone
            frameRate: { ideal: 30 } // Paksa 30fps konstan agar tidak janky
          },
        });
        
        streamRef.current = mediaStream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Gagal mengakses webcam:", err);
      }
    }
    
    enableCamera();

    // 🌟 ANTI MEMORY-LEAK: Hancurkan track hardware secara total saat unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          streamRef.current?.removeTrack(track);
        });
        streamRef.current = null;
      }
    };
  }, []);

  // Mendengarkan trigger jepret dari parent component
  useEffect(() => {
    if (triggerSnap && videoRef.current) {
      const video = videoRef.current;
      const tempCanvas = document.createElement("canvas");
      
      // Sesuaikan ukuran canvas dengan aspek rasio video internal hardware
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      
      // 🌟 AKSELERASI CONTEXT: Gunakan willReadFrequently untuk mempercepat jepretan piksel
      const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });

      if (ctx) {
        // Efek mirror pas dijepret agar hasil foto searah dengan preview mata kita
        ctx.translate(tempCanvas.width, 0);
        ctx.scale(-1, 1);
        
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        onCapture(tempCanvas); 
      }
      onSnapDone(); 
    }
  }, [triggerSnap, onCapture, onSnapDone]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        // 🌟 GPU ACCELERATION: Tambahkan transform-gpu agar render preview dibebankan ke kartu grafis
        className="w-full h-full object-cover scale-x-[-1] transform-gpu" 
      />
    </div>
  );
}