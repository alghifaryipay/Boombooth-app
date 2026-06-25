import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 🌟 1. Tangkap file murni dari FormData (Anti-Payload Too Large)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // 🌟 2. Upload langsung ke Gudang Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public', // Wajib public agar QR Code bisa di-scan HP orang lain
    });

    // 🌟 3. Kembalikan URL Cloud-nya
    return NextResponse.json({ success: true, url: blob.url });

  } catch (error: any) {
    console.error("🚨 VERCEL BLOB UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Gagal menyimpan ke Vercel Blob: " + error.message }, { status: 500 });
  }
}