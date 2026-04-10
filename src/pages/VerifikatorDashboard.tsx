import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { Proposal } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle, FileText, Download, MapPin, Clock, List } from 'lucide-react';
import jsPDF from 'jspdf';

export default function VerifikatorDashboard() {
  const { currentUser, auth } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  
  // Scoring state
  const [skorKelengkapan, setSkorKelengkapan] = useState<number>(0);
  const [skorKesesuaian, setSkorKesesuaian] = useState<number>(0);
  const [skorKeselarasan, setSkorKeselarasan] = useState<number>(0);
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [skorError, setSkorError] = useState<{ field: string; message: string } | null>(null);

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth?.currentUser?.uid,
        email: auth?.currentUser?.email,
        role: currentUser?.role
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!currentUser || !currentUser.instansi) return;

    const path = 'proposals';
    // Filter proposals by the Verifikator's instansi
    const q = query(collection(db, path), where('instansi', '==', currentUser.instansi));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
      setProposals(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const pendingProposals = proposals.filter(p => p.status === 'Menunggu Review');
  const reviewedProposals = proposals.filter(p => p.verifikatorId === currentUser?.uid);

  const totalSkor = skorKelengkapan + skorKesesuaian + skorKeselarasan;
  const isLulus = totalSkor >= 75;

  const handleReviewClick = (p: Proposal) => {
    setSelectedProposal(p);
    if (p.status === 'Menunggu Review') {
      setSkorKelengkapan(0);
      setSkorKesesuaian(0);
      setSkorKeselarasan(0);
      setCatatan('');
    } else {
      setSkorKelengkapan(p.skor?.kelengkapan || 0);
      setSkorKesesuaian(p.skor?.kesesuaian || 0);
      setSkorKeselarasan(p.skor?.keselarasan || 0);
      setCatatan(p.catatanVerifikasi || '');
    }
  };

  const handleScoreChange = (setter: (val: number) => void, value: string, max: number, fieldName: string) => {
    const num = Number(value);
    if (num > max) {
      setSkorError({ field: fieldName, message: `Nilai maksimal untuk ${fieldName} adalah ${max}` });
      setter(max);
      setTimeout(() => setSkorError(null), 3000);
    } else {
      setSkorError(null);
      setter(num < 0 ? 0 : num);
    }
  };

  const handleSubmitReview = async (status: 'Diterima' | 'Ditolak') => {
    if (!selectedProposal || !selectedProposal.id || !currentUser) return;
    if (!catatan.trim()) {
      alert('Catatan verifikasi wajib diisi!');
      return;
    }

    setLoading(true);
    const path = `proposals/${selectedProposal.id}`;
    try {
      const proposalRef = doc(db, 'proposals', selectedProposal.id);
      await updateDoc(proposalRef, {
        skor: {
          kelengkapan: skorKelengkapan,
          kesesuaian: skorKesesuaian,
          keselarasan: skorKeselarasan,
          total: totalSkor
        },
        catatanVerifikasi: catatan,
        status,
        verifikatorId: currentUser.uid
      });
      setSelectedProposal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = (p: Proposal) => {
    const doc = new jsPDF();
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BERITA ACARA HASIL VERIFIKASI USULAN", 105, 20, { align: "center" });
    doc.text("SISTEM VERIFIKASI USULAN FORUM PERANGKAT DAERAH", 105, 27, { align: "center" });
    doc.text("PROVINSI SUMATERA UTARA", 105, 34, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const introText = `Pada hari ini, ${dayName}, tanggal ${dateNum}, bulan ${monthName}, tahun Dua Ribu Dua Puluh Enam pada Sistem Verifikasi Usulan Forum Perangkat Daerah Provinsi Sumatera Utara (SIVERDA-SUMUT) telah dilakukan Verifikasi Usulan Forum Perangkat Daerah Provinsi Sumatera Utara dengan rincian:`;
    doc.text(introText, 20, 50, { maxWidth: 170, align: "justify" });
    
    let y = 75;
    const drawRow = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(`: ${value}`, 60, y, { maxWidth: 130 });
      y += 8; // Reverted to standard spacing
    };

    drawRow("ID Usulan", p.id || '-');
    drawRow("Judul Usulan", p.judul);
    drawRow("Pengusul", `${p.pengusulName}`);
    drawRow("Asal Daerah", `${p.asalDaerah || '-'}`);
    drawRow("Instansi", p.instansi);
    drawRow("Kategori", p.kategori);
    drawRow("Pagu Anggaran", `Rp ${p.paguAnggaran?.toLocaleString('id-ID')}`);
    drawRow("Tanggal Ajuan", format(new Date(p.tanggalPengajuan), 'dd MMMM yyyy'));
    
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("HASIL PENILAIAN VERIFIKASI:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`1. Kelengkapan Administrasi`, 25, y); doc.text(`: ${p.skor?.kelengkapan} / 30`, 80, y); y += 7;
    doc.text(`2. Kesesuaian Kewenangan`, 25, y); doc.text(`: ${p.skor?.kesesuaian} / 35`, 80, y); y += 7;
    doc.text(`3. Keselarasan RKPD`, 25, y); doc.text(`: ${p.skor?.keselarasan} / 35`, 80, y); y += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL SKOR`, 25, y); doc.text(`: ${p.skor?.total} / 100`, 80, y); y += 10;
    
    doc.text(`STATUS AKHIR`, 20, y); doc.text(`: ${p.status.toUpperCase()}`, 60, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Catatan`, 20, y);
    doc.text(`: ${p.catatanVerifikasi || '-'}`, 60, y, { maxWidth: 130 });
    
    y += 40; // Added significant spacing between Catatan and Signature
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    // Middle Title
    doc.text("PIHAK YANG MENYEPAKATI", 105, y - 15, { align: "center" });

    // Left Signature
    let title = "Kepala";
    if (p.instansi.startsWith("Rumah Sakit")) {
      title = "Direktur";
    } else if (p.instansi.startsWith("Inspektorat")) {
      title = "Inspektur";
    }
    
    doc.text(`${title} ${p.instansi}`, 50, y, { align: "center" });
    doc.text("Provinsi Sumatera Utara", 50, y + 5, { align: "center" });
    doc.text("(...................................)", 50, y + 35, { align: "center" });

    // Right Signature
    const asalDaerah = p.asalDaerah || 'Kabupaten/Kota';
    let bappedaLabel = `Kepala Bappeda ${asalDaerah}`;
    
    doc.text(bappedaLabel, 160, y, { align: "center" });
    doc.text("(...................................)", 160, y + 35, { align: "center" });

    doc.save(`Berita_Acara_${p.id}.pdf`);
  };

  const totalUsulanMasuk = proposals.length;
  const totalDiverifikasi = proposals.filter(p => p.status !== 'Menunggu Review').length;
  const totalDitolak = proposals.filter(p => p.status === 'Ditolak').length;
  const totalBelumDiverifikasi = proposals.filter(p => p.status === 'Menunggu Review').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Usulan</h1>
        <p className="text-sm text-gray-500">Lakukan verifikasi dan skoring pada usulan yang masuk ke instansi Anda ({currentUser?.instansi}).</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <List className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Masuk</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Usulan Masuk</p>
          <p className="text-2xl font-bold text-gray-900">{totalUsulanMasuk}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Selesai</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Usulan Diverifikasi</p>
          <p className="text-2xl font-bold text-gray-900">{totalDiverifikasi}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">Ditolak</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Usulan Ditolak</p>
          <p className="text-2xl font-bold text-gray-900">{totalDitolak}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Pending</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Belum Diverifikasi PD</p>
          <p className="text-2xl font-bold text-gray-900">{totalBelumDiverifikasi}</p>
        </div>
      </div>

      {selectedProposal ? (
        <div className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Form Verifikasi: {selectedProposal.judul}</h2>
            <button onClick={() => setSelectedProposal(null)} className="text-sm text-slate-700 hover:underline">Kembali</button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Detail Usulan</h3>
              <div className="space-y-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p><span className="font-medium text-gray-900">Pengusul:</span> {selectedProposal.pengusulName}</p>
                <p><span className="font-medium text-gray-900">Asal Daerah:</span> {selectedProposal.asalDaerah || '-'}</p>
                <p><span className="font-medium text-gray-900">Instansi:</span> {selectedProposal.instansi}</p>
                <p><span className="font-medium text-gray-900">Kategori:</span> {selectedProposal.kategori}</p>
                <p><span className="font-medium text-gray-900">Pagu Anggaran:</span> Rp {selectedProposal.paguAnggaran?.toLocaleString('id-ID')}</p>
                <p><span className="font-medium text-gray-900">Tanggal:</span> {format(new Date(selectedProposal.tanggalPengajuan), 'dd MMM yyyy')}</p>
                
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <span className="font-medium text-gray-900 block mb-1">Deskripsi:</span>
                  <p className="whitespace-pre-wrap">{selectedProposal.deskripsi}</p>
                </div>

                <div className="pt-2 border-t border-gray-200 mt-2 space-y-2">
                  <span className="font-medium text-gray-900 block mb-1">Lampiran & Tautan:</span>
                  {selectedProposal.linkLokasi && (
                    <a href={selectedProposal.linkLokasi} target="_blank" rel="noopener noreferrer" className="flex items-center text-slate-900 hover:underline">
                      <MapPin className="w-4 h-4 mr-1.5" /> Lihat Lokasi (Google Maps)
                    </a>
                  )}
                  {selectedProposal.kakUrl && (
                    <a href={selectedProposal.kakUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-slate-900 hover:underline">
                      <FileText className="w-4 h-4 mr-1.5" /> Lihat Dokumen KAK
                    </a>
                  )}
                  {selectedProposal.rabUrl && (
                    <a href={selectedProposal.rabUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-slate-900 hover:underline">
                      <FileText className="w-4 h-4 mr-1.5" /> Lihat Dokumen RAB
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Penilaian (Skoring)</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>Kelengkapan Administrasi/Dokumen</span>
                    <span className="text-gray-500">Max 30</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="30" 
                    value={skorKelengkapan} 
                    onChange={e => handleScoreChange(setSkorKelengkapan, e.target.value, 30, 'Kelengkapan')} 
                    className={`w-full px-3 py-2 border rounded-md focus:ring-slate-900 focus:border-slate-900 ${skorError?.field === 'Kelengkapan' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} 
                  />
                  {skorError?.field === 'Kelengkapan' && <p className="text-xs text-red-600 mt-1">{skorError.message}</p>}
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>Kesesuaian Kewenangan</span>
                    <span className="text-gray-500">Max 35</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="35" 
                    value={skorKesesuaian} 
                    onChange={e => handleScoreChange(setSkorKesesuaian, e.target.value, 35, 'Kesesuaian')} 
                    className={`w-full px-3 py-2 border rounded-md focus:ring-slate-900 focus:border-slate-900 ${skorError?.field === 'Kesesuaian' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} 
                  />
                  {skorError?.field === 'Kesesuaian' && <p className="text-xs text-red-600 mt-1">{skorError.message}</p>}
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                    <span>Keselarasan dengan RKPD</span>
                    <span className="text-gray-500">Max 35</span>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="35" 
                    value={skorKeselarasan} 
                    onChange={e => handleScoreChange(setSkorKeselarasan, e.target.value, 35, 'Keselarasan')} 
                    className={`w-full px-3 py-2 border rounded-md focus:ring-slate-900 focus:border-slate-900 ${skorError?.field === 'Keselarasan' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} 
                  />
                  {skorError?.field === 'Keselarasan' && <p className="text-xs text-red-600 mt-1">{skorError.message}</p>}
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total Skor:</span>
                  <span className={`text-2xl font-bold ${isLulus ? 'text-green-600' : 'text-red-600'}`}>{totalSkor}</span>
                </div>

                <div className={`p-3 rounded-md flex items-start ${isLulus ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {isLulus 
                      ? 'Skor >= 75. Usulan memenuhi syarat untuk DITERIMA.' 
                      : 'Skor < 75. Usulan tidak memenuhi syarat dan otomatis DITOLAK.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Verifikasi (Wajib)</label>
                  <textarea 
                    required
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:ring-slate-900 focus:border-slate-900"
                    placeholder="Berikan alasan atau catatan hasil review..."
                  />
                </div>

                {selectedProposal.status === 'Menunggu Review' ? (
                  <div className="flex space-x-3 pt-2">
                    <button 
                      onClick={() => handleSubmitReview('Ditolak')}
                      disabled={isLulus || loading}
                      className={`flex-1 flex justify-center items-center px-4 py-2 rounded-md font-medium text-white transition-colors ${isLulus || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Tolak
                    </button>
                    <button 
                      onClick={() => handleSubmitReview('Diterima')}
                      disabled={!isLulus || loading}
                      className={`flex-1 flex justify-center items-center px-4 py-2 rounded-md font-medium text-white transition-colors ${!isLulus || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Terima
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => handleExportPDF(selectedProposal)}
                      className="w-full flex justify-center items-center px-4 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
                    >
                      <FileText className="w-4 h-4 mr-2" /> Download Berita Acara
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Menunggu Review ({pendingProposals.length})</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usulan</th>
                    <th className="px-6 py-4 font-medium">Pengusul</th>
                    <th className="px-6 py-4 font-medium">Asal Daerah</th>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingProposals.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada usulan baru.</td></tr>
                  ) : (
                    pendingProposals.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.judul}</td>
                        <td className="px-6 py-4 text-gray-600">{p.pengusulName}</td>
                        <td className="px-6 py-4 text-gray-600">{p.asalDaerah || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{format(new Date(p.tanggalPengajuan), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleReviewClick(p)} className="text-slate-900 font-medium hover:text-slate-700">Review</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Review Anda</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usulan</th>
                    <th className="px-6 py-4 font-medium">Asal Daerah</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Skor</th>
                    <th className="px-6 py-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviewedProposals.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Belum ada riwayat review.</td></tr>
                  ) : (
                    reviewedProposals.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.judul}</td>
                        <td className="px-6 py-4 text-gray-600">{p.asalDaerah || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'Diterima' || p.status === 'Validasi Final' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">{p.skor?.total}</td>
                        <td className="px-6 py-4 flex items-center space-x-3">
                          <button 
                            onClick={() => handleReviewClick(p)}
                            className="text-slate-900 hover:text-slate-700 font-medium"
                          >
                            Detail
                          </button>
                          {(p.status === 'Diterima' || p.status === 'Validasi Final') && (
                            <button 
                              onClick={() => handleExportPDF(p)}
                              className="flex items-center text-gray-600 hover:text-slate-900 font-medium transition-colors"
                            >
                              <FileText className="w-4 h-4 mr-1.5" /> Download BA
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
