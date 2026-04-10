import React from 'react';

export default function Architecture() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Arsitektur & Skema SIVERDA-SUMUT</h1>
        <p className="text-gray-500">Dokumentasi teknis sesuai dengan spesifikasi yang diminta.</p>
      </div>

      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">1. Struktur Folder Proyek (React + Vite / MERN Stack)</h2>
        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
{`siverda-sumut/
âââ client/                 # Frontend React (Vite)
â   âââ src/
â   â   âââ components/     # UI Components (Layout, Modal, dll)
â   â   âââ pages/          # Halaman berdasarkan Role (Pengusul, Verifikator, Bapperida)
â   â   âââ store/          # State Management (Zustand/Redux)
â   â   âââ lib/            # Utility functions (calculateScore, exportPDF)
â   â   âââ types/          # TypeScript Interfaces
â   â   âââ App.tsx         # Main Routing
â   â   âââ index.css       # Tailwind CSS
âââ server/                 # Backend Node.js (Express)
â   âââ controllers/        # Logika bisnis (Auth, Usulan, Skoring)
â   âââ models/             # Skema Database (Mongoose/Prisma)
â   âââ routes/             # API Endpoints
â   âââ middleware/         # RBAC Auth Middleware
â   âââ server.js           # Entry point backend
âââ package.json
âââ .env`}
        </pre>
      </section>

      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">2. Skema Database (NoSQL - MongoDB / Firebase)</h2>
        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
{`// Collection: Users
{
  _id: ObjectId,
  name: String,
  email: String,
  passwordHash: String,
  role: Enum['pengusul', 'verifikator', 'bapperida'],
  instansi: String,       // Khusus pengusul
  asalDaerah: String,     // Khusus pengusul
  createdAt: Timestamp
}

// Collection: Proposals (Usulan)
{
  _id: ObjectId,
  pengusulId: ObjectId (Ref: Users),
  judul: String,
  deskripsi: String,
  status: Enum['Menunggu Review', 'Ditolak', 'Diterima', 'Validasi Final'],
  tanggalPengajuan: Timestamp,
  
  // Relasi Skoring (Embedded Document)
  skor: {
    kelengkapan: Number, // Max 30
    kesesuaian: Number,  // Max 35
    keselarasan: Number, // Max 35
    total: Number        // Max 100
  },
  
  catatanVerifikasi: String,
  verifikatorId: ObjectId (Ref: Users), // Siapa yang mereview
  bapperidaId: ObjectId (Ref: Users),   // Siapa yang memvalidasi final
  updatedAt: Timestamp
}`}
        </pre>
      </section>

      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">3. Contoh Kode: calculateScore() & Validasi Tombol</h2>
        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
{`// Frontend Logic (React Component)
const [skorKelengkapan, setSkorKelengkapan] = useState(0); // Max 30
const [skorKesesuaian, setSkorKesesuaian] = useState(0);   // Max 35
const [skorKeselarasan, setSkorKeselarasan] = useState(0); // Max 35
const [catatan, setCatatan] = useState('');

// Fungsi Kalkulasi
const calculateScore = () => {
  return skorKelengkapan + skorKesesuaian + skorKeselarasan;
};

const totalSkor = calculateScore();
const isLulus = totalSkor >= 75;

// Validasi Tombol UI
<button 
  disabled={isLulus} // Disabled jika skor >= 75
  className={\`btn \${isLulus ? 'btn-disabled' : 'btn-danger'}\`}
  onClick={() => submitReview('Ditolak')}
>
  Tolak
</button>

<button 
  disabled={!isLulus} // Disabled jika skor < 75
  className={\`btn \${!isLulus ? 'btn-disabled' : 'btn-success'}\`}
  onClick={() => submitReview('Diterima')}
>
  Terima
</button>

// Validasi Wajib Isi Catatan
const submitReview = (status) => {
  if (!catatan.trim()) {
    alert("Catatan Verifikasi Wajib Diisi!");
    return;
  }
  // Lanjut hit API...
};`}
        </pre>
      </section>

      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">4. Template HTML/CSS Berita Acara (Siap Konversi PDF)</h2>
        <p className="text-sm text-gray-600 mb-4">Template ini dapat dirender di hidden div dan dikonversi menggunakan <code>html2canvas</code> & <code>jspdf</code>, atau dicetak langsung.</p>
        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
{`<!DOCTYPE html>
<html>
<head>
<style>
  .ba-container { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 0 auto; padding: 40px; }
  .ba-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
  .ba-title { font-size: 18px; font-weight: bold; margin: 0; }
  .ba-subtitle { font-size: 14px; margin: 5px 0 0 0; }
  .ba-content { font-size: 12px; line-height: 1.6; }
  .ba-table { width: 100%; margin: 15px 0; border-collapse: collapse; }
  .ba-table td { padding: 5px; vertical-align: top; }
  .ba-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; text-align: center; }
  .sign-box { margin-bottom: 30px; }
  .sign-space { height: 80px; }
</style>
</head>
<body>
  <div class="ba-container" id="berita-acara-template">
    <div class="ba-header">
      <h1 class="ba-title">BERITA ACARA HASIL VERIFIKASI USULAN</h1>
      <p class="ba-subtitle">SISTEM VERIFIKASI USULAN PEMBANGUNAN SUMATERA UTARA</p>
    </div>
    
    <div class="ba-content">
      <p>Pada hari ini, telah dilakukan verifikasi final terhadap usulan pembangunan dengan rincian:</p>
      
      <table class="ba-table">
        <tr><td width="150">ID Usulan</td><td width="10">:</td><td>#USL-2026-001</td></tr>
        <tr><td>Judul Usulan</td><td>:</td><td>Pembangunan Jembatan</td></tr>
        <tr><td>Pengusul</td><td>:</td><td>Budi (Dinas Pendidikan)</td></tr>
        <tr><td>Total Skor</td><td>:</td><td><strong>85/100 (DITERIMA)</strong></td></tr>
      </table>

      <p>Demikian Berita Acara ini dibuat untuk dapat dipergunakan sebagaimana mestinya.</p>
    </div>

    <div class="ba-signatures">
      <div class="sign-box">
        <p>Kepala Dinas Perangkat Daerah<br>Provinsi Sumatera Utara</p>
        <div class="sign-space"></div>
        <p>(...................................)</p>
      </div>
      <div class="sign-box">
        <p>Kepala Bappeda<br>Kabupaten/Kota</p>
        <div class="sign-space"></div>
        <p>(...................................)</p>
      </div>
      <div class="sign-box">
        <p>Perwakilan Delegasi Kecamatan/<br>Unsur Masyarakat</p>
        <div class="sign-space"></div>
        <p>(...................................)</p>
      </div>
      <div class="sign-box">
        <p>Pimpinan Desk Bapperida<br>Provinsi Sumatera Utara</p>
        <div class="sign-space"></div>
        <p>(...................................)</p>
      </div>
    </div>
  </div>
</body>
</html>`}
        </pre>
      </section>
    </div>
  );
}
