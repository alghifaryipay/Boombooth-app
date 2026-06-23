export interface FrameSlot {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  thumbnail: string;
  src: string;
  slots: FrameSlot[];
}

export const FRAME_DATABASE: FrameTemplate[] = [
  {
    id: "harian-inspirasi-koran",
    name: "Harian Inspirasi (Tema Koran)",
    thumbnail: "/frames/koran-thumb.png",
    src: "/frames/koran-frame.png", // Taruh file PNG kamu di folder public/frames/
    slots: [
      { xPct: 0.383, yPct: 0.320, wPct: 0.588, hPct: 0.306 }, // Kotak Tengah Besar
      { xPct: 0.030, yPct: 0.690, wPct: 0.295, hPct: 0.175 }, // Kotak Kiri Kecil
      { xPct: 0.678, yPct: 0.690, wPct: 0.295, hPct: 0.175 }  // Kotak Kanan Kecil
    ]
  },
  {
    id: "classic-polaroid",
    name: "Classic Polaroid",
    thumbnail: "/frames/polaroid-thumb.png",
    src: "/frames/polaroid-frame.png",
    slots: [
      { xPct: 0.100, yPct: 0.100, wPct: 0.800, hPct: 0.650 }  // Satu kotak besar ala polaroid
    ]
  }
];