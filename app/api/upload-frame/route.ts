import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const frameName = formData.get("name") as string;

    if (!file || !frameName) {
      return NextResponse.json({ error: "File atau nama frame tidak lengkap!" }, { status: 400 });
    }

    const safeFileName = frameName.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".webp";
    const targetDir = path.join(process.cwd(), "public", "frames");
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, safeFileName);
    const bytes = await file.arrayBuffer();
    
    // Tulis file fisik murni
    fs.writeFileSync(targetPath, Buffer.from(bytes));

    // Update katalog JSON (Tanpa Base64 agar server super ringan!)
    const catalogPath = path.join(process.cwd(), "public", "frames", "catalog.json");
    let currentCatalog: any[] = [];

    if (fs.existsSync(catalogPath)) {
      try {
        currentCatalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
      } catch (e) {
        currentCatalog = [];
      }
    }

    const newFrameData = {
      id: safeFileName.replace(".webp", ""),
      name: frameName,
      src: `/frames/${safeFileName}`, // Kembali ke URL path normal
    };

    const existingIndex = currentCatalog.findIndex(f => f.id === newFrameData.id);
    if (existingIndex !== -1) {
      currentCatalog[existingIndex] = newFrameData;
    } else {
      currentCatalog.push(newFrameData);
    }

    fs.writeFileSync(catalogPath, JSON.stringify(currentCatalog, null, 2));
    return NextResponse.json({ success: true, frame: newFrameData });

  } catch (err: any) {
    console.error("🚨 GAGAL SAVE & SYNC FRAME:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, newName } = body;

    if (!id || !newName) return NextResponse.json({ error: "Data tidak lengkap!" }, { status: 400 });

    const catalogPath = path.join(process.cwd(), "public", "frames", "catalog.json");
    if (!fs.existsSync(catalogPath)) return NextResponse.json({ error: "Katalog tidak ditemukan!" }, { status: 404 });

    let catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    const index = catalog.findIndex((f: any) => f.id === id);

    if (index === -1) return NextResponse.json({ error: "Frame tidak ditemukan!" }, { status: 404 });

    catalog[index].name = newName;
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    return NextResponse.json({ success: true, updatedFrame: catalog[index] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID Frame diperlukan!" }, { status: 400 });

    const catalogPath = path.join(process.cwd(), "public", "frames", "catalog.json");
    if (!fs.existsSync(catalogPath)) return NextResponse.json({ error: "Katalog tidak ditemukan!" }, { status: 404 });

    let catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
    const frameToDelete = catalog.find((f: any) => f.id === id);

    if (!frameToDelete) return NextResponse.json({ error: "Frame tidak ditemukan di katalog!" }, { status: 404 });

    const fileName = `${id}.webp`;
    const filePath = path.join(process.cwd(), "public", "frames", fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    catalog = catalog.filter((f: any) => f.id !== id);
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

    return NextResponse.json({ success: true, message: "Frame berhasil dihapus permanen!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}