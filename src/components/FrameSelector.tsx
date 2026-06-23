"use client";

import { DynamicFrame } from "@/types/frame";

interface FrameSelectorProps {
  database: DynamicFrame[];
  selectedFrame: DynamicFrame | null;
  onSelectFrame: (frame: DynamicFrame) => void;
}

export default function FrameSelector({ database, selectedFrame, onSelectFrame }: FrameSelectorProps) {
  const safeData = database || [];
  
  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8172] mb-5">Pilih Tema Bingkai</p>
      
      {/* Grid responsif: otomatis melebar memenuhi layar web */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {safeData.map((frame: DynamicFrame) => {
          const isSelected = selectedFrame?.id === frame.id;
          
          return (
            <button
              key={frame.id}
              onClick={() => onSelectFrame(frame)}
              className="group flex flex-col gap-3 text-left focus:outline-none"
            >
              {/* Pembungkus Gambar Preview Frame */}
              <div 
                className={`w-full aspect-[3/4] bg-[#FAF8F5] rounded-2xl overflow-hidden p-2.5 transition-all duration-300 border ${
                  isSelected 
                    ? "border-[#111111] bg-[#F1ECE1] shadow-md scale-[1.02]" 
                    : "border-[#EFEBE1] hover:border-[#111111]/40 hover:shadow-xs"
                }`}
              >
                {/* Gambar Bingkai Asli */}
                <div className="w-full h-full rounded-xl bg-white overflow-hidden shadow-2xs border border-[#EFEBE1]/60 relative">
                  {frame.src ? (
                    <img 
                      src={frame.src} 
                      alt={frame.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    // Fallback jika aset gambar belum diupload di database/public
                    <div className="w-full h-full flex items-center justify-center bg-[#FAF8F5] text-[10px] text-[#A69B88]">
                      No Preview
                    </div>
                  )}
                </div>
              </div>

              {/* Label Nama Tema di Bawah Gambar */}
              <div className="px-1">
                <p className={`text-xs font-semibold tracking-tight transition-colors ${isSelected ? "text-[#111111]" : "text-[#7A7161] group-hover:text-[#111111]"}`}>
                  {frame.name}
                </p>
                <span className="text-[9px] text-[#B8AF9E] tracking-wider uppercase font-medium">Ready to Print</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}