export interface DynamicSlot {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export interface DynamicFrame {
  id: string;
  name: string;
  src: string;
  slots?: DynamicSlot[]; // Kita kasih tanda '?' agar opsional dan aman jika di API tidak ada slots
}