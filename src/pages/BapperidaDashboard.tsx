import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, secondaryAuth } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, where, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Proposal, User } from '../types';

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
import { Download, FileText, CheckCircle, UserPlus, Users, Edit2, Save, X, MapPin, Trash2, Clock, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DAFTAR_INSTANSI_PD } from '../constants';

export default function BapperidaDashboard() {
  const { currentUser, auth } = useAuth();
  const [activeTab, setActiveTab] = useState<'usulan' | 'verifikator'>('usulan');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [verifikators, setVerifikators] = useState<User[]>([]);
  
  const [vName, setVName] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPassword, setVPassword] = useState('');
  const [vInstansi, setVInstansi] = useState('');
  const [vValidUntil, setVValidUntil] = useState('');
  const [creatingV, setCreatingV] = useState(false);
  const [vError, setVError] = useState('');
  const [vSuccess, setVSuccess] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInstansi, setEditInstansi] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

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
    const pathP = 'proposals';
    const qProposals = query(collection(db, pathP));
    const unsubProposals = onSnapshot(qProposals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
      setProposals(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathP);
    });

    const pathU = 'users';
    const qUsers = query(collection(db, pathU), where('role', '==', 'verifikator'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as User);
      setVerifikators(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathU);
    });

    return () => {
      unsubProposals();
      unsubUsers();
    };
  }, []);

  const acceptedProposals = proposals.filter(p => p.status === 'Diterima');
  const finalProposals = proposals.filter(p => p.status === 'Validasi Final');

  const handleValidateProposal = async (id: string) => {
    if (!currentUser) return;
    const path = `proposals/${id}`;
    try {
      await updateDoc(doc(db, 'proposals', id), {
        status: 'Validasi Final',
        bapperidaId: currentUser.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleCreateVerifikator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vEmail || !vPassword || !vName || !vInstansi || !currentUser) return;
    setCreatingV(true);
    setVError('');
    setVSuccess('');
    const path = `users`;
    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, vEmail, vPassword);
      
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        name: vName,
        email: vEmail,
        role: 'verifikator',
        instansi: vInstansi,
        validUntil: vValidUntil || null,
        createdAt: new Date().toISOString()
      });

      await secondaryAuth.signOut();

      setVSuccess(`Akun Verifikator ${vName} berhasil dibuat.`);
      setVName('');
      setVEmail('');
      setVPassword('');
      setVInstansi('');
      setVValidUntil('');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setCreatingV(false);
    }
  };

  const handleStartEdit = (v: User) => {
    setEditingId(v.uid);
    setEditName(v.name);
    setEditInstansi(v.instansi || '');
    setEditValidUntil(v.validUntil || '');
  };

  const handleSaveEdit = async (uid: string) => {
    setVError('');
    setVSuccess('');
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        name: editName,
        instansi: editInstansi,
        validUntil: editValidUntil || null
      });
      setVSuccess(`Profil ${editName} berhasil diperbarui.`);
      setEditingId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteVerifikator = async (uid: string) => {
    setVError('');
    setVSuccess('');
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setVSuccess(`Akun ${deletingName} berhasil dihapus dari daftar.`);
      setDeletingId(null);
      setDeletingName('');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleExportExcel = () => {
    const data = finalProposals.map(p => ({
      'ID Usulan': p.id,
      'Judul': p.judul,
      'Pengusul': p.pengusulName,
      'Asal Daerah': p.asalDaerah || '-',
      'Instansi': p.instansi,
      'Kategori': p.kategori,
      'Pagu Anggaran': p.paguAnggaran,
      'Link Lokasi': p.linkLokasi,
      'Tanggal': format(new Date(p.tanggalPengajuan), 'dd/MM/yyyy'),
      'Skor Total': p.skor?.total,
      'Status': p.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Usulan");
    XLSX.writeFile(wb, "Rekap_Usulan_SIVERDA.xlsx");
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

  const totalUsulan = proposals.filter(p => p.status === 'Diterima' || p.status === 'Validasi Final').length;
  const totalDivalidasiFinal = proposals.filter(p => p.status === 'Validasi Final').length;
  const totalBelumDivalidasiFinal = proposals.filter(p => p.status === 'Diterima').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Bapperida</h1>
          <p className="text-sm text-gray-500">Validasi final dan manajemen akun.</p>
        </div>
        {activeTab === 'usulan' && (
          <button 
            onClick={handleExportExcel}
            disabled={finalProposals.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel (Final)
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Total</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Usulan Masuk</p>
          <p className="text-2xl font-bold text-gray-900">{totalUsulan}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Selesai</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Divalidasi Final</p>
          <p className="text-2xl font-bold text-gray-900">{totalDivalidasiFinal}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Pending</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Belum Validasi Final</p>
          <p className="text-2xl font-bold text-gray-900">{totalBelumDivalidasiFinal}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-full">Akun</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Verifikator PD</p>
          <p className="text-2xl font-bold text-gray-900">{verifikators.length}</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setActiveTab('usulan')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'usulan' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Validasi Usulan
        </button>
        <button
          onClick={() => setActiveTab('verifikator')}
          className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'verifikator' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Manajemen Verifikator PD
        </button>
      </div>

      {activeTab === 'usulan' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
              Menunggu Validasi Final ({acceptedProposals.length})
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usulan</th>
                    <th className="px-6 py-4 font-medium">Pengusul</th>
                    <th className="px-6 py-4 font-medium">Asal Daerah</th>
                    <th className="px-6 py-4 font-medium">Skor</th>
                    <th className="px-6 py-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {acceptedProposals.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada usulan menunggu validasi.</td></tr>
                  ) : (
                    acceptedProposals.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.judul}</td>
                        <td className="px-6 py-4 text-gray-600">{p.pengusulName}</td>
                        <td className="px-6 py-4 text-gray-600">{p.asalDaerah || '-'}</td>
                        <td className="px-6 py-4 font-semibold text-green-600">{p.skor?.total}</td>
                        <td className="px-6 py-4 flex items-center space-x-2">
                          <button 
                            onClick={() => setSelectedProposal(p)}
                            className="text-slate-900 hover:text-slate-700 font-medium px-2 py-1"
                          >
                            Detail
                          </button>
                          <button 
                            onClick={() => handleValidateProposal(p.id!)} 
                            className="flex items-center text-slate-900 font-medium hover:text-slate-700 bg-slate-50 px-3 py-1.5 rounded-md"
                          >
                            <CheckCircle className="w-4 h-4 mr-1.5" /> Validasi Final
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              Usulan Tervalidasi ({finalProposals.length})
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usulan</th>
                    <th className="px-6 py-4 font-medium">Asal Daerah</th>
                    <th className="px-6 py-4 font-medium">Skor</th>
                    <th className="px-6 py-4 font-medium">Berita Acara</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {finalProposals.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada usulan final.</td></tr>
                  ) : (
                    finalProposals.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.judul}</td>
                        <td className="px-6 py-4 text-gray-600">{p.asalDaerah || '-'}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{p.skor?.total}</td>
                        <td className="px-6 py-4 flex items-center space-x-3">
                          <button 
                            onClick={() => setSelectedProposal(p)}
                            className="text-slate-900 hover:text-slate-700 font-medium"
                          >
                            Detail
                          </button>
                          <button 
                            onClick={() => handleExportPDF(p)}
                            className="flex items-center text-gray-600 hover:text-red-600 font-medium transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-1.5" /> Download BA
                          </button>
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

      {activeTab === 'verifikator' && (
        <div className="space-y-8">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Buat Akun Verifikator PD Baru
            </h2>
            <p className="text-sm text-slate-700 mb-4">Buat akun untuk Verifikator Perangkat Daerah. Anda dapat mengatur batas waktu akses untuk akun ini.</p>
            
            {vError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{vError}</div>}
            {vSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">{vSuccess}</div>}

            <form onSubmit={handleCreateVerifikator} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input 
                type="text" 
                required
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="Nama"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none"
              />
              <input 
                type="email" 
                required
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
                placeholder="Email"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none"
              />
              <input 
                type="password" 
                required
                minLength={6}
                value={vPassword}
                onChange={(e) => setVPassword(e.target.value)}
                placeholder="Password"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none"
              />
              <select 
                required 
                value={vInstansi} 
                onChange={(e) => setVInstansi(e.target.value)} 
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none bg-white"
              >
                <option value="" disabled>Pilih Instansi</option>
                {DAFTAR_INSTANSI_PD.map((inst, idx) => (
                  <option key={idx} value={inst}>{inst}</option>
                ))}
              </select>
              <div className="flex flex-col">
                <input 
                  type="date" 
                  value={vValidUntil}
                  onChange={(e) => setVValidUntil(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none"
                  title="Batas Waktu (Opsional)"
                />
                <span className="text-xs text-slate-600 mt-1 ml-1">Batas Waktu (Opsional)</span>
              </div>
              <button 
                type="submit" 
                disabled={creatingV}
                className="px-6 py-2 h-[42px] bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:bg-slate-400"
              >
                {creatingV ? 'Membuat...' : 'Buat Akun'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              Daftar Akun Verifikator PD ({verifikators.length})
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-medium">Nama</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Instansi</th>
                    <th className="px-6 py-4 font-medium">Batas Waktu</th>
                    <th className="px-6 py-4 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {verifikators.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Belum ada akun Verifikator PD.</td></tr>
                  ) : (
                    verifikators.map(v => (
                      <tr key={v.uid} className="hover:bg-gray-50">
                        {editingId === v.uid ? (
                          <>
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                value={editName} 
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                              />
                            </td>
                            <td className="px-6 py-4 text-gray-500">{v.email}</td>
                            <td className="px-6 py-4">
                              <select 
                                value={editInstansi} 
                                onChange={(e) => setEditInstansi(e.target.value)} 
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white"
                              >
                                <option value="" disabled>Pilih Instansi</option>
                                {DAFTAR_INSTANSI_PD.map((inst, idx) => (
                                  <option key={idx} value={inst}>{inst}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="date" 
                                value={editValidUntil} 
                                onChange={(e) => setEditValidUntil(e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                              />
                            </td>
                            <td className="px-6 py-4 flex space-x-2">
                              <button onClick={() => handleSaveEdit(v.uid)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 font-medium text-gray-900">{v.name}</td>
                            <td className="px-6 py-4 text-gray-600">{v.email}</td>
                            <td className="px-6 py-4 text-gray-600">{v.instansi || '-'}</td>
                            <td className="px-6 py-4 text-gray-600">
                              {v.validUntil ? format(new Date(v.validUntil), 'dd MMM yyyy') : <span className="text-gray-400 italic">Tidak ada batas</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={() => handleStartEdit(v)}
                                  className="flex items-center text-slate-900 hover:text-slate-700 font-medium"
                                >
                                  <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                                </button>
                                <button 
                                  onClick={() => {
                                    setDeletingId(v.uid);
                                    setDeletingName(v.name);
                                  }}
                                  className="flex items-center text-red-600 hover:text-red-800 font-medium"
                                >
                                  <Trash2 className="w-4 h-4 mr-1.5" /> Hapus
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Detail Usulan</h2>
              <button onClick={() => setSelectedProposal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Informasi Dasar</h3>
                  <div className="space-y-3">
                    <p className="text-sm"><span className="text-gray-500">Judul:</span> <br/><span className="font-medium">{selectedProposal.judul}</span></p>
                    <p className="text-sm"><span className="text-gray-500">Kategori:</span> <br/><span className="font-medium">{selectedProposal.kategori}</span></p>
                    <p className="text-sm"><span className="text-gray-500">Pagu Anggaran:</span> <br/><span className="font-medium">Rp {selectedProposal.paguAnggaran?.toLocaleString('id-ID')}</span></p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pengusul & Lokasi</h3>
                  <div className="space-y-3">
                    <p className="text-sm"><span className="text-gray-500">Nama Pengusul:</span> <br/><span className="font-medium">{selectedProposal.pengusulName}</span></p>
                    <p className="text-sm"><span className="text-gray-500">Asal Daerah:</span> <br/><span className="font-medium">{selectedProposal.asalDaerah || '-'}</span></p>
                    <p className="text-sm"><span className="text-gray-500">Instansi Tujuan:</span> <br/><span className="font-medium">{selectedProposal.instansi}</span></p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Deskripsi Usulan</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
                  {selectedProposal.deskripsi}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dokumen & Tautan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedProposal.linkLokasi && (
                    <a href={selectedProposal.linkLokasi} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                      <MapPin className="w-4 h-4 mr-2" /> Lokasi Maps
                    </a>
                  )}
                  {selectedProposal.kakUrl && (
                    <a href={selectedProposal.kakUrl} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                      <FileText className="w-4 h-4 mr-2" /> Dokumen KAK
                    </a>
                  )}
                  {selectedProposal.rabUrl && (
                    <a href={selectedProposal.rabUrl} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium">
                      <FileText className="w-4 h-4 mr-2" /> Dokumen RAB
                    </a>
                  )}
                </div>
              </div>

              {selectedProposal.skor && (
                <div className="bg-gray-900 text-white p-6 rounded-2xl">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Hasil Verifikasi Verifikator PD</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedProposal.skor.kelengkapan}</p>
                      <p className="text-[10px] text-gray-400 uppercase">Admin</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedProposal.skor.kesesuaian}</p>
                      <p className="text-[10px] text-gray-400 uppercase">Wewenang</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedProposal.skor.keselarasan}</p>
                      <p className="text-[10px] text-gray-400 uppercase">RKPD</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                    <div>
                      <p className="text-xs text-gray-400">Total Skor</p>
                      <p className="text-xl font-bold">{selectedProposal.skor.total} / 100</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedProposal.skor.total >= 75 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {selectedProposal.skor.total >= 75 ? 'MEMENUHI SYARAT' : 'TIDAK MEMENUHI'}
                    </div>
                  </div>
                  {selectedProposal.catatanVerifikasi && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <p className="text-xs text-gray-400 mb-1">Catatan Verifikator:</p>
                      <p className="text-sm italic text-gray-300">"{selectedProposal.catatanVerifikasi}"</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                {(selectedProposal.status === 'Diterima' || selectedProposal.status === 'Validasi Final') && (
                  <button 
                    onClick={() => handleExportPDF(selectedProposal)}
                    className="flex-1 flex justify-center items-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-5 h-5 mr-2" /> Download Berita Acara
                  </button>
                )}
                {selectedProposal.status === 'Diterima' && (
                  <button 
                    onClick={() => {
                      handleValidateProposal(selectedProposal.id!);
                      setSelectedProposal(null);
                    }}
                    className="flex-1 flex justify-center items-center px-6 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" /> Validasi Final
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Akun?</h3>
              <p className="text-gray-500 mb-6">
                Apakah Anda yakin ingin menghapus akun <strong>{deletingName}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => handleDeleteVerifikator(deletingId)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

