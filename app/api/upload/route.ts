import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan dari form!" }, { status: 400 });
    }

    // Ekstrak file murni
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `boombooth-${Date.now()}.png`;
    const targetDir = path.join(process.cwd(), "public", "captured");

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, fileName);
    
    // Tulis ke harddisk
    fs.writeFileSync(targetPath, buffer);

    return NextResponse.json({ success: true, url: `/captured/${fileName}` });

  } catch (error: any) {
    console.error("🚨 CRASH API UPLOAD:", error);
    return NextResponse.json({ error: "Gagal menyimpan file: " + error.message }, { status: 500 });
  }
}