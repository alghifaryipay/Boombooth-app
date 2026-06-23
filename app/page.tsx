"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import BoothCamera from "@/components/BoothCamera";
import BoothCanvas from "@/components/BoothCanvas";
import FrameSelector from "@/components/FrameSelector";
import { DynamicFrame } from "@/types/frame";
import QRCode from "qrcode";

export default function PhotoboothPage() {
  const [framesList, setFramesList] = useState<DynamicFrame[]>([]);
  const [currentFrame, setCurrentFrame] = useState<DynamicFrame | null>(null);
  const [slotsCount, setSlotsCount] = useState<number>(3);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(-1);

  const [capturedPhotos, setCapturedPhotos] = useState<HTMLCanvasElement[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("normal");
  const [triggerSnap, setTriggerSnap] = useState<boolean>(false);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [step, setStep] = useState<"landing" | "booth" | "result">("landing");
  const [isUploading, startUploadTransition] = useTransition();

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await fetch("/api/frames");
        const data = await response.json();
        if (data && data.length > 0) {
          setFramesList(data);
          setCurrentFrame(data[0]);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi API:", err);
      }
    }
    loadTemplates();
  }, []);

  async function startPhotoSession() {
    if (!currentFrame) return;

    setStep("booth");
    setFinalImage(null);
    setQrCodeUrl(null);
    setCapturedPhotos([]);
    setActiveSlotIndex(0);

    setTimeout(async () => {
      if (videoContainerRef.current) {
        const video = videoContainerRef.current.querySelector("video");
        if (video) setVideoElement(video);
      }

      setIsSessionActive(true);

      for (let i = 0; i < slotsCount; i++) {
        setActiveSlotIndex(i);

        for (let count = 3; count > 0; count--) {
          setCountdown(count);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setCountdown(null);
        
        setTriggerSnap(true);

        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      setActiveSlotIndex(-1);

      setTimeout(async () => {
        const finalCanvas = document.getElementById("boombooth-core-canvas") as HTMLCanvasElement | null;
        if (finalCanvas) {
          try {
            setStep("result");

            // 🌟 BYPASS FORM-DATA: Ubah canvas jadi teks Base64 langsung (Anti Error 500)
            const base64Image = finalCanvas.toDataURL("image/png", 0.90);
            
            // Tampilkan instan di layar
            setFinalImage(base64Image);

            startUploadTransition(async () => {
              try {
                // Kirim sebagai JSON murni, bukan FormData
                const uploadResponse = await fetch("/api/upload", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image: base64Image }),
                });

                const uploadResult = await uploadResponse.json();

                if (!uploadResponse.ok) {
                  throw new Error(uploadResult.error || "Server menolak data gambar");
                }

                if (uploadResult.success && uploadResult.url) {
                  // Jika berhasil, buatkan QR Code-nya
                  const qrSvg = await QRCode.toDataURL(uploadResult.url, {
                    margin: 1, width: 180, color: { dark: "#111111", light: "#ffffff" }
                  });
                  setQrCodeUrl(qrSvg);
                }
              } catch (err: any) {
                console.error("🚨 Error Upload Server:", err.message);
                alert("Gagal sinkron ke server: " + err.message);
              }
            });

          } catch (err) {
            console.error("Gagal mengeksport gambar:", err);
          }
        }
        setIsSessionActive(false);
      }, 600);
    }, 400);
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] antialiased font-sans selection:bg-[#EAE4D7] overflow-x-hidden">
      {/* 🧭 NAVIGATION BAR: Padding dikecilkan di layar HP (px-4) */}
      <header className="border-b border-[#EFEBE1] bg-[#FAF8F5]/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-3 md:py-4.5 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setStep("landing")}>
          <span className="font-serif text-lg md:text-xl tracking-tight font-bold italic">BoomBooth<span className="text-[#C5BBA6] font-sans font-normal not-italic text-[9px] md:text-xs ml-0.5">®</span></span>
        </div>
        <div className="text-[9px] md:text-[10px] font-semibold tracking-wider uppercase text-[#7A7161] bg-[#F1EBE0] px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-[#E5DEC1]/40">
          Studio Active
        </div>
      </header>

      {/* 🏛️ STEP 1: LANDING */}
      {step === "landing" && (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12 md:pb-16 text-center transform-gpu animate-fadeIn select-none">
          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-[0.25em] md:tracking-[0.3em] text-[#B8AF9E] mb-3 block">
            Interactive Capture Terminal
          </span>
          {/* Tulisan utama menyesuaikan layar (text-4xl di HP, 6xl di Laptop) */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#111111] mb-4 md:mb-5 leading-[1.12]">
            Capture moments, <br />
            <span className="italic font-light text-[#8A7E6A]">perfectly preserved.</span>
          </h1>
          <p className="font-sans text-[11px] sm:text-xs md:text-sm text-[#7A7161] max-w-lg mx-auto mb-8 md:mb-10 leading-relaxed font-light px-2">
            Sistem photo-booth minimalis modern. Pilih tema cetak koran estetik, ambil gambar lewat kamera, dan dapatkan QR code unduhan instan.
          </p>
          
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-[#EFEBE1] shadow-[0_12px_40px_rgba(229,222,209,0.12)] mb-8 md:mb-10 text-left">
            <FrameSelector database={framesList} selectedFrame={currentFrame} onSelectFrame={setCurrentFrame} />
          </div>
          
          <button
            onClick={startPhotoSession}
            className="inline-flex items-center gap-3 md:gap-4 bg-[#111111] hover:bg-[#2B2722] text-[#FAF8F5] px-8 py-3.5 md:px-12 md:py-4 rounded-full font-sans font-semibold text-[10px] md:text-xs tracking-widest uppercase transition-all shadow-md hover:shadow-xl active:scale-[0.98]"
          >
            Buka Kamera Studio
            <svg className="w-3.5 h-3.5 transform translate-y-[-0.5px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}

      {/* 📸 STEP 2: LIVE STUDIO CAPTURE GRID */}
      {step === "booth" && (
        <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 transform-gpu animate-fadeIn select-none">
          {/* Di HP bakal numpuk (1 kolom), di Laptop jadi 10 kolom bersampingan */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-5 md:gap-6 items-start justify-center">
            
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-[#EFEBE1] shadow-[0_8px_24px_rgba(229,222,209,0.08)]">
                <div className="flex items-center justify-between mb-3 border-b border-[#FAF8F5] pb-2">
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#8A8172] flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#111111] animate-pulse" /> Live Viewport
                  </span>
                </div>
                <div ref={videoContainerRef} className="relative aspect-[4/3] w-full bg-[#151515] rounded-xl overflow-hidden border border-[#EFEBE1] shadow-inner transform-gpu">
                  <BoothCamera
                    isCapturing={isSessionActive}
                    triggerSnap={triggerSnap}
                    onCapture={(canvas: HTMLCanvasElement) => setCapturedPhotos((prev) => [...prev, canvas])}
                    onSnapDone={() => setTriggerSnap(false)}
                  />
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-[#FAF8F5]/10 backdrop-blur-xs flex items-center justify-center transition-all z-10">
                      <div className="font-serif italic text-5xl md:text-6xl text-[#111111] animate-scaleIn drop-shadow-lg">
                        {countdown}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 md:p-5 border border-[#EFEBE1] shadow-xs">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#8A8172] mb-3">Tone Mood</p>
                <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                  {[
                    { id: "normal", name: "Original" },
                    { id: "grayscale", name: "B&W" },
                    { id: "vintage", name: "Warm" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id)}
                      className={`py-2 px-1 rounded-xl border text-center font-semibold text-[10px] md:text-[11px] tracking-tight transition-all ${activeFilter === f.id
                          ? "bg-[#111111] border-[#111111] text-white"
                          : "bg-white border-[#EFEBE1] text-[#7A7161] hover:border-[#111111]"
                        }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-6 flex justify-center w-full">
              {/* Ukuran lebar canvas preview disesuaikan biar gak mentok layar HP */}
              <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-[#EFEBE1] shadow-[0_8px_24px_rgba(229,222,209,0.08)] flex flex-col items-center w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px]">
                <p className="w-full text-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#8A8172] border-b border-[#FAF8F5] pb-2 mb-3 md:mb-4">
                  Live Strip Composition
                </p>
                <div className="w-full p-2 md:p-2.5 bg-[#FAF8F5] border border-[#EFEBE1] rounded-2xl shadow-inner transform-gpu [image-rendering:pixelated]">
                  <BoothCanvas
                    currentFrame={currentFrame}
                    capturedPhotos={capturedPhotos || []}
                    videoElement={videoElement}
                    activeFilter={activeFilter}
                    onSlotsDetected={setSlotsCount}
                    activeSlotIndex={activeSlotIndex}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🏁 STEP 3: SCREEN HASIL AKHIR & DOWNLOAD */}
      {step === "result" && (
        <div className="w-full max-w-md mx-auto px-4 py-8 md:py-12 text-center transform-gpu animate-fadeIn">
          <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-7 border border-[#EFEBE1] shadow-[0_12px_40px_rgba(229,222,209,0.3)] flex flex-col items-center mx-2 sm:mx-0">
            <h2 className="font-serif text-xl md:text-2xl font-normal text-[#111111] mb-1">Memories Archived.</h2>
            <p className="text-[10px] md:text-[11px] text-[#8A8172] mb-5 md:mb-6 font-light">Lembar cetak digital Anda siap diunduh ke galeri.</p>

            <div className="w-full max-w-[200px] md:max-w-[240px] p-2 md:p-2.5 bg-[#FAF8F5] border border-[#EFEBE1] rounded-xl mb-6 shadow-inner transform-gpu [image-rendering:pixelated]">
              <BoothCanvas
                currentFrame={currentFrame}
                capturedPhotos={capturedPhotos || []}
                videoElement={null}
                activeFilter={activeFilter}
                onSlotsDetected={setSlotsCount}
                activeSlotIndex={-1}
              />
            </div>

            <div className="w-full grid grid-cols-2 gap-2.5 md:gap-3">
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full bg-[#F4EFE6] hover:bg-[#EFEBE1] text-[#111111] py-3 md:py-3.5 rounded-full font-semibold text-[10px] md:text-[11px] tracking-wider uppercase transition-all border border-[#E5DEC1] flex items-center justify-center gap-2"
              >
                Wireless QR
              </button>
              {finalImage ? (
                <a
                  href={finalImage}
                  download={`boombooth-${Date.now()}.png`}
                  className="w-full bg-[#111111] hover:bg-[#2B2722] text-white py-3 md:py-3.5 rounded-full font-semibold text-[10px] md:text-[11px] tracking-wider uppercase transition-all text-center flex items-center justify-center gap-2 shadow-xs"
                >
                  Save Image
                </a>
              ) : (
                <div className="w-full bg-[#111111]/40 text-white py-3 md:py-3.5 rounded-full font-semibold text-[10px] md:text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 animate-pulse">
                  Rendering...
                </div>
              )}
            </div>

            <button
              onClick={() => setStep("landing")}
              className="mt-6 text-[10px] md:text-xs font-medium text-[#8A8172] hover:text-[#111111] transition-all underline underline-offset-4"
            >
              Take Another Session
            </button>
          </div>
        </div>
      )}

      {/* 📱 SCREEN POP-UP MODAL QR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#111111]/15 backdrop-blur-md transform-gpu animate-fadeIn">
          <div className="bg-white max-w-[260px] md:max-w-[280px] w-full rounded-2xl border border-[#EFEBE1] p-4 md:p-5 text-center shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center mb-4 border-b border-[#FAF8F5] pb-2">
              <h3 className="font-bold text-[9px] md:text-[10px] uppercase tracking-widest text-[#8A8172]">Scan to Phone</h3>
              <button onClick={() => setShowQrModal(false)} className="h-6 w-6 rounded-full bg-[#FAF8F5] hover:bg-[#EFEBE1] flex items-center justify-center text-xs">✕</button>
            </div>

            <div className="w-36 h-36 md:w-40 md:h-40 mx-auto bg-white p-2 border border-[#EFEBE1] rounded-xl flex items-center justify-center shadow-inner">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] font-bold text-[#8A8172] uppercase tracking-wider">Uploading</span>
                </div>
              ) : qrCodeUrl ? (
                <img src={qrCodeUrl} className="w-full h-full object-contain" alt="QR Link" />
              ) : (
                <div className="text-[9px] font-semibold text-red-500">Generating Link...</div>
              )}
            </div>

            <div className="mt-4 text-[8px] md:text-[9px] font-bold text-[#C5BBA6] bg-[#FAF8F5] py-1.5 rounded-full border border-[#EFEBE1] uppercase tracking-widest">
              Unduh Instan via QR Code
            </div>
          </div>
        </div>
      )}
    </main>
  );
}