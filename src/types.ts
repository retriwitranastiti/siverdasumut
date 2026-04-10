export type Role = 'pengusul' | 'verifikator' | 'bapperida';

export interface User {
  uid: string;
  name: string;
  role: Role;
  instansi?: string;
  asalDaerah?: string;
  email: string;
  createdAt: string;
  validUntil?: string; // Untuk batas waktu akun Verifikator PD
}

export interface Proposal {
  id?: string;
  pengusulId: string;
  pengusulName: string;
  instansi: string;
  asalDaerah?: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  paguAnggaran: number;
  linkLokasi: string;
  kakUrl?: string;
  rabUrl?: string;
  tanggalPengajuan: string;
  status: 'Menunggu Review' | 'Ditolak' | 'Diterima' | 'Validasi Final';
  skor?: {
    kelengkapan: number; // max 30
    kesesuaian: number; // max 40
    keselarasan: number; // max 30
    total: number;
  };
  catatanVerifikasi?: string;
  verifikatorId?: string;
  bapperidaId?: string;
}
