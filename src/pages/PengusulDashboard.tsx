import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
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
import { Plus, User as UserIcon, MapPin, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { KATEGORI_USULAN, DAFTAR_INSTANSI_PD, DAFTAR_KAB_KOTA } from '../constants';

export default function PengusulDashboard() {
  const { currentUser, auth } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  
  // Proposal Form State
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kategori, setKategori] = useState('');
  const [asalDaerah, setAsalDaerah] = useState('');
  const [paguAnggaran, setPaguAnggaran] = useState<number | ''>('');
  const [linkLokasi, setLinkLokasi] = useState('');
  const [kakUrl, setKakUrl] = useState('');
  const [rabUrl, setRabUrl] = useState('');
  
  // Profile Form State
  const [editInstansi, setEditInstansi] = useState('');
  const [editAsalDaerah, setEditAsalDaerah] = useState('');

  const [loading, setLoading] = useState(false);

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
    if (!currentUser) return;
    setEditInstansi(currentUser.instansi || '');
    setEditAsalDaerah(currentUser.asalDaerah || '');
    setAsalDaerah(currentUser.asalDaerah || '');

    const path = 'proposals';
    const q = query(collection(db, path), where('pengusulId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
      setProposals(data.sort((a, b) => new Date(b.tanggalPengajuan).getTime() - new Date(a.tanggalPengajuan).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    const path = `users/${currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        instansi: editInstansi,
        asalDaerah: editAsalDaerah
      });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!kakUrl || !rabUrl) {
      alert("Harap isi link KAK dan RAB.");
      return;
    }
    
    setLoading(true);
    const path = 'proposals';
    
    try {
      const newProposal: Omit<Proposal, 'id'> = {
        pengusulId: currentUser.uid,
        pengusulName: currentUser.name,
        instansi: currentUser.instansi || '',
        asalDaerah: asalDaerah || currentUser.asalDaerah || '',
        judul,
        deskripsi,
        kategori,
        paguAnggaran: Number(paguAnggaran),
        linkLokasi,
        kakUrl,
        rabUrl,
        status: 'Menunggu Review',
        tanggalPengajuan: new Date().toISOString(),
      };
      await addDoc(collection(db, path), newProposal);
      setIsAdding(false);
      
      // Reset form
      setJudul('');
      setDeskripsi('');
      setKategori('');
      setAsalDaerah(currentUser.asalDaerah || '');
      setPaguAnggaran('');
      setLinkLokasi('');
      setKakUrl('');
      setRabUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Menunggu Review': return 'bg-yellow-100 text-yellow-800';
      case 'Diterima': return 'bg-green-100 text-green-800';
      case 'Ditolak': return 'bg-red-100 text-red-800';
      case 'Validasi Final': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Usulan</h1>
          <p className="text-sm text-gray-500">Daftar usulan pembangunan yang Anda ajukan.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => {
              setIsEditingProfile(!isEditingProfile);
              setIsAdding(false);
            }}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <UserIcon className="w-4 h-4 mr-2" /> {isEditingProfile ? 'Batal Edit' : 'Edit Profil'}
          </button>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setIsEditingProfile(false);
            }}
            className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
          >
            {isAdding ? 'Batal' : <><Plus className="w-4 h-4 mr-2" /> Ajukan Usulan Baru</>}
          </button>
        </div>
      </div>

      {isEditingProfile && (
        <div className="mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Edit Profil Pengusul</h2>
          <p className="text-sm text-blue-700 mb-4">Pastikan Instansi Anda sesuai dengan pilihan yang ada agar usulan dapat masuk ke Verifikator yang tepat.</p>
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instansi</label>
                <select 
                  required
                  value={editInstansi}
                  onChange={(e) => setEditInstansi(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                >
                  <option value="" disabled>Pilih Instansi</option>
                  {DAFTAR_INSTANSI_PD.map((inst, idx) => (
                    <option key={idx} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asal Daerah (Kab/Kota)</label>
                <select 
                  required
                  value={editAsalDaerah}
                  onChange={(e) => setEditAsalDaerah(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all"
                >
                  <option value="" disabled>Pilih Asal Daerah</option>
                  {DAFTAR_KAB_KOTA.map((kab, idx) => (
                    <option key={idx} value={kab}>{kab}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:bg-slate-700">
                {loading ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isAdding && (
        <div className="mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Formulir Usulan Baru</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Usulan</label>
                <input 
                  type="text" 
                  required
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                  placeholder="Contoh: Pembangunan Jembatan Desa X"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asal Daerah (Kab/Kota)</label>
                <select 
                  required
                  value={asalDaerah}
                  onChange={(e) => setAsalDaerah(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white transition-all"
                >
                  <option value="" disabled>Pilih Asal Daerah</option>
                  {DAFTAR_KAB_KOTA.map((kab, idx) => (
                    <option key={idx} value={kab}>{kab}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Usulan</label>
                <select 
                  required
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white transition-all"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {KATEGORI_USULAN.map((kat, idx) => (
                    <option key={idx} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pagu Anggaran (Rp)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={paguAnggaran}
                  onChange={(e) => setPaguAnggaran(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                  placeholder="Contoh: 150000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Lokasi (Google Maps)</label>
                <input 
                  type="url" 
                  required
                  value={linkLokasi}
                  onChange={(e) => setLinkLokasi(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white transition-all"
                  placeholder="https://goo.gl/maps/..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi & Rincian</label>
              <textarea 
                required
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                placeholder="Jelaskan latar belakang, tujuan, dan rincian usulan..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Dokumen KAK (Google Drive)</label>
                <input 
                  type="url" 
                  required
                  value={kakUrl}
                  onChange={(e) => setKakUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white transition-all"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Dokumen RAB (Google Drive)</label>
                <input 
                  type="url" 
                  required
                  value={rabUrl}
                  onChange={(e) => setRabUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none bg-white transition-all"
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" disabled={loading} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:bg-slate-700">
                {loading ? 'Mengirim...' : 'Kirim Usulan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-6 py-4 font-medium">Judul Usulan</th>
              <th className="px-6 py-4 font-medium">Asal Daerah</th>
              <th className="px-6 py-4 font-medium">Kategori</th>
              <th className="px-6 py-4 font-medium">Pagu Anggaran</th>
              <th className="px-6 py-4 font-medium">Tanggal</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Skor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Belum ada usulan yang diajukan.
                </td>
              </tr>
            ) : (
              proposals.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{p.judul}</div>
                    <div className="text-gray-500 text-xs mt-1 truncate max-w-xs">{p.deskripsi}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{p.asalDaerah || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{p.kategori}</td>
                  <td className="px-6 py-4 text-gray-600">Rp {p.paguAnggaran?.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {format(new Date(p.tanggalPengajuan), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {p.skor ? (
                        <div className="font-semibold text-gray-900">{p.skor.total} / 100</div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                      <button 
                        onClick={() => setSelectedProposal(p)}
                        className="text-slate-900 hover:text-slate-700 font-medium text-xs underline"
                      >
                        Detail
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Detail Usulan</h2>
              <button onClick={() => setSelectedProposal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Informasi Dasar</h3>
                    <p className="text-lg font-bold text-gray-900">{selectedProposal.judul}</p>
                    <p className="text-sm text-gray-500">{selectedProposal.kategori}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Anggaran</h3>
                    <p className="text-lg font-bold text-slate-900">Rp {selectedProposal.paguAnggaran?.toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedProposal.status)}`}>
                      {selectedProposal.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Asal Daerah</h3>
                    <p className="text-sm font-medium text-gray-900">{selectedProposal.asalDaerah || '-'}</p>
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
                    <a href={selectedProposal.linkLokasi} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
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
                <div className="bg-slate-900 text-white p-6 rounded-2xl">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Hasil Verifikasi</h3>
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
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <div>
                      <p className="text-xs text-gray-400">Total Skor</p>
                      <p className="text-xl font-bold">{selectedProposal.skor.total} / 100</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedProposal.skor.total >= 75 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {selectedProposal.skor.total >= 75 ? 'MEMENUHI SYARAT' : 'TIDAK MEMENUHI'}
                    </div>
                  </div>
                  {selectedProposal.catatanVerifikasi && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <p className="text-xs text-gray-400 mb-1">Catatan Verifikator:</p>
                      <p className="text-sm italic text-gray-300">"{selectedProposal.catatanVerifikasi}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
