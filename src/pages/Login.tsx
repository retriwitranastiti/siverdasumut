import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { loginWithEmail, resetPassword } from '../firebase';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { currentUser, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (currentUser) {
    if (currentUser.role === 'pengusul') return <Navigate to="/pengusul" replace />;
    if (currentUser.role === 'verifikator') return <Navigate to="/verifikator" replace />;
    if (currentUser.role === 'bapperida') return <Navigate to="/bapperida" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setResetMsg('');
    try {
      await loginWithEmail(email, password);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMsg("Email atau password salah. Pastikan Anda sudah mendaftar.");
      } else {
        setErrorMsg(error.message || "Terjadi kesalahan saat login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg("Masukkan email Anda terlebih dahulu di kolom Email untuk mereset password.");
      return;
    }
    setErrorMsg('');
    setResetMsg('');
    try {
      await resetPassword(email);
      setResetMsg("Email reset password telah dikirim. Silakan cek inbox/spam Anda untuk membuat password baru.");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        setErrorMsg("Email tidak ditemukan. Pastikan Anda sudah mendaftar.");
      } else {
        setErrorMsg(error.message || "Gagal mengirim email reset password.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SIVERDA-SUMUT</h1>
          <p className="text-gray-500 text-sm">Sistem Verifikasi Usulan Pembangunan Sumatera Utara</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        {resetMsg && (
          <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
            {resetMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none"
              placeholder="Masukkan email Anda"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="text-xs text-slate-900 hover:text-slate-700 font-medium"
              >
                Lupa Password?
              </button>
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-900 outline-none"
              placeholder="Masukkan password Anda"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-medium mt-4 disabled:bg-slate-400"
          >
            {isSubmitting ? 'Memproses...' : (
              <><LogIn className="w-5 h-5 mr-2" /> Login</>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Belum punya akun? <Link to="/register" className="text-slate-900 font-medium hover:underline">Daftar sebagai Pengusul</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
