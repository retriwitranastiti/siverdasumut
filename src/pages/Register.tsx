import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmail, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { DAFTAR_INSTANSI_PD, DAFTAR_KAB_KOTA } from '../constants';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [instansi, setInstansi] = useState('');
  const [asalDaerah, setAsalDaerah] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const userCredential = await registerWithEmail(email, password);
      const user = userCredential.user;

      const role = email === 'retri.nastiti@gmail.com' ? 'bapperida' : 'pengusul';

      const newUser: User = {
        uid: user.uid,
        name,
        email,
        role,
        instansi,
        asalDaerah,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), newUser);
      navigate(`/${role}`);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg("Email ini sudah terdaftar. Silakan gunakan email lain atau login.");
      } else {
        setErrorMsg(error.message || "Gagal mendaftar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-100">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Daftar Akun</h1>
          <p className="text-gray-500 text-sm">Buat akun untuk mengakses sistem SIVERDA-SUMUT.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instansi</label>
            <select required value={instansi} onChange={(e) => setInstansi(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all">
              <option value="" disabled>Pilih Instansi</option>
              {DAFTAR_INSTANSI_PD.map((inst, idx) => (
                <option key={idx} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asal Daerah (Kab/Kota)</label>
            <select required value={asalDaerah} onChange={(e) => setAsalDaerah(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none bg-white transition-all">
              <option value="" disabled>Pilih Asal Daerah</option>
              {DAFTAR_KAB_KOTA.map((kab, idx) => (
                <option key={idx} value={kab}>{kab}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all font-medium mt-4 disabled:bg-slate-400 shadow-md hover:shadow-lg">
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun? <Link to="/" className="text-slate-900 font-medium hover:underline">Login di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
