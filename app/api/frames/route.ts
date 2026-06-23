import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const catalogPath = path.join(process.cwd(), "public", "frames", "catalog.json");
    
    // Jika katalog ada, kirim isinya ke halaman depan pengguna
    if (fs.existsSync(catalogPath)) {
      const fileData = fs.readFileSync(catalogPath, "utf-8");
      const frames = JSON.parse(fileData);
      return NextResponse.json(frames);
    }

    // Fallback data bawaan jika katalog masih kosong pertama kali
    const defaultFrames = [
      {
        id: "koran-default",
        name: "Harian Inspirasi (Koran)",
        src: "/frames/polaroid-frame.png", // sesuaikan path awalmu
        slots: []
      }
    ];
    return NextResponse.json(defaultFrames);

  } catch (err: any) {
    return NextResponse.json([], { status: 500 });
  }
}