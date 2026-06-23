"use client";

import { useState, useEffect } from "react";

interface FrameItem {
  id: string;
  name: string;
  src: string;
}

export default function AdminUploadFrame() {
  const [frameName, setFrameName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [framesList, setFramesList] = useState<FrameItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  // Load daftar frame yang bisa dipakai orang lain saat halaman dibuka
  const fetchFrames = async () => {
    try {
      const res = await fetch("/api/frames");
      const data = await res.json();
      if (Array.isArray(data)) setFramesList(data);
    } catch (err) {
      console.error("Gagal load katalog frame");
    }
  };

  useEffect(() => {
    fetchFrames();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handler Upload Frame Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !frameName) return;

    setLoading(true);
    setStatus({ type: null, msg: "" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", frameName);

    try {
      const res = await fetch("/api/upload-frame", { method: "POST", body: formData });
      const result = await res.json();

      if (result.success) {
        setStatus({ type: "success", msg: `Frame "${result.frame.name}" berhasil disimpan!` });
        setFrameName("");
        setFile(null);
        const input = document.getElementById("file-input") as HTMLInputElement;
        if (input) input.value = "";
        fetchFrames(); // Refresh list katalog
      } else {
        setStatus({ type: "error", msg: result.error || "Gagal mengunggah." });
      }
    } catch (err) {
      setStatus({ type: "error", msg: "Gagal tersambung ke server." });
    } finally {
      setLoading(false);
    }
  };

  // Handler Hapus Frame
  const handleDelete = async (id: string) => {
    if (!confirm("Yakin mau hapus frame ini dari sistem secara permanen, Bos?")) return;

    try {
      const res = await fetch(`/api/upload-frame?id=${id}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        setStatus({ type: "success", msg: "Frame berhasil didelete dari server!" });
        fetchFrames();
      } else {
        setStatus({ type: "error", msg: result.error || "Gagal menghapus." });
      }
    } catch (err) {
      setStatus({ type: "error", msg: "Gagal memproses hapus data." });
    }
  };

  // Handler Simpan Perubahan Nama (Edit)
  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const res = await fetch("/api/upload-frame", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, newName: editingName }),
      });
      const result = await res.json();

      if (result.success) {
        setStatus({ type: "success", msg: "Nama frame berhasil diperbarui!" });
        setEditingId(null);
        setEditingName("");
        fetchFrames();
      } else {
        setStatus({ type: "error", msg: result.error || "Gagal update nama." });
      }
    } catch (err) {
      setStatus({ type: "error", msg: "Gagal edit data." });
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] p-6 md:p-12 font-sans text-[#1A1A1A] flex flex-col gap-8 items-center">
      {/* SECTION FORM UPLOAD */}
      <div className="max-w-xl w-full bg-white border border-[#EFEBE1] rounded-3xl p-8 shadow-[0_8px_32px_rgba(229,222,209,0.12)]">
        <div className="border-b border-[#FAF8F5] pb-4 mb-6">
          <h1 className="font-serif text-2xl font-bold italic">BoomBooth Engine</h1>
          <p className="text-[9px] text-[#8A8172] tracking-widest uppercase font-bold">Upload Frame Hub</p>
        </div>

        {status.type && (
          <div className={`mb-5 p-4 rounded-xl text-xs font-medium border ${
            status.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-[#8A8172] block mb-1.5">Nama Frame Baru</label>
            <input
              type="text" required placeholder="Contoh: Koran Wisuda, Polaroid Square"
              value={frameName} onChange={(e) => setFrameName(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EFEBE1] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-[#8A8172] block mb-1.5">File Template (.webp bolong/transparan)</label>
            <input
              id="file-input" type="file" required accept=".webp" onChange={handleFileChange}
              className="w-full bg-[#FAF8F5] border border-[#EFEBE1] rounded-xl px-4 py-3 text-xs font-mono focus:outline-none"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#111111] hover:bg-[#2B2722] text-[#FAF8F5] py-3.5 rounded-full font-semibold text-xs tracking-widest uppercase transition-all disabled:opacity-40"
          >
            {loading ? "Menyimpan..." : "Upload Premium Frame"}
          </button>
        </form>
      </div>

      {/* SECTION MANAJEMEN KATALOG (EDIT & HAPUS) */}
      <div className="max-w-xl w-full bg-white border border-[#EFEBE1] rounded-3xl p-8 shadow-[0_8px_32px_rgba(229,222,209,0.12)]">
        <h2 className="text-[11px] uppercase font-bold tracking-widest text-[#8A8172] mb-4">Daftar Aktif Frame Studio ({framesList.length})</h2>
        
        {framesList.length === 0 ? (
          <p className="text-xs text-[#B8AF9E] italic text-center py-4">Belum ada frame yang ter-upload di katalog.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {framesList.map((frame) => (
              <div key={frame.id} className="flex items-center justify-between p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EFEBE1] gap-4">
                <div className="flex-1 min-w-0">
                  {editingId === frame.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)}
                        className="bg-white border border-[#EFEBE1] rounded-lg px-2 py-1 text-xs focus:outline-none flex-1"
                      />
                      <button onClick={() => handleSaveEdit(frame.id)} className="text-[10px] font-bold text-green-600 uppercase">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-gray-400 uppercase">Batal</button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[#111111] truncate">{frame.name}</p>
                      <p className="text-[9px] text-[#B8AF9E] font-mono truncate">{frame.id}.webp</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {editingId !== frame.id && (
                    <button
                      onClick={() => { setEditingId(frame.id); setEditingName(frame.name); }}
                      className="text-[10px] font-bold text-[#8A7E6A] hover:text-[#111111] uppercase tracking-wider"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(frame.id)}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}