import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, ArrowLeft, ShieldCheck, Cpu, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const MANUALS = [
  {
    id: 'slim4500',
    title: 'Automação Slim 4500',
    description: 'Manual técnico completo para configuração e operação do sistema Slim 4500.',
    file: '/downloads/Slim_4500.pdf',
    category: 'Sistemas Antigos',
    icon: <Cpu className="w-6 h-6" />
  },
  {
    id: 'general',
    title: 'Guia do Usuário - Elite Hub',
    description: 'Manual de referência rápida para os controles essenciais do ecossistema Hub.',
    file: '#',
    category: 'Oficial',
    icon: <Settings className="w-6 h-6" />
  }
];

const Downloads: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      setIsAuthorized(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 rounded-[40px] max-w-md w-full border border-white/5 text-center"
        >
          <div className="w-20 h-20 bg-gold-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldCheck className="w-10 h-10 text-gold-500" />
          </div>
          <h2 className="text-3xl font-black italic uppercase text-white mb-4 italic tracking-tighter">Área Restrita</h2>
          <p className="text-white/40 text-sm mb-10 leading-relaxed">Insira a senha de acesso técnico para visualizar a documentação confidencial do sistema Elite.</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de Acesso"
              className={`w-full h-16 bg-white/5 border rounded-2xl px-6 text-center text-xl font-bold tracking-[0.5em] transition-all outline-none focus:ring-2 focus:ring-gold-500/50 ${error ? 'border-red-500' : 'border-white/10'}`}
              autoFocus
            />
            {error && <p className="text-red-500 text-[10px] uppercase font-black tracking-widest animate-pulse">Senha Incorreta</p>}
            <button 
              type="submit"
              className="w-full h-16 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-gold-500 transition-colors"
            >
              Acessar Manuais
            </button>
          </form>
          
          <Link to="/" className="inline-flex items-center gap-2 text-white/20 hover:text-white transition-colors mt-8 text-[9px] uppercase font-black tracking-widest">
            <ArrowLeft className="w-3 h-3" /> Voltar ao Início
          </Link>
        </motion.div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .glass-card {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans pt-32 pb-20 px-6">
      <div className="mx-auto w-full max-w-[1750px] px-8 md:px-16 lg:px-20">
        <header className="mb-16">
          <Link to="/" className="inline-flex items-center gap-2 text-gold-500 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] uppercase font-black tracking-widest">Voltar ao Início</span>
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="text-gold-500 font-black text-[10px] uppercase tracking-[0.5em] mb-4 block">Centro de Suporte</span>
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                Manuais <span className="text-white/20">&</span> Documentação
              </h1>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 max-w-sm">
               <ShieldCheck className="text-gold-500 shrink-0" />
               <p className="text-xs text-white/50 leading-snug">Conteúdo exclusivo para clientes e engenheiros parceiros do sistema Elite.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MANUALS.map((manual, idx) => (
            <motion.div
              key={manual.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card group hover:border-gold-500/40 transition-all p-8 rounded-[40px] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 rounded-2xl bg-white/5 text-gold-500 group-hover:bg-gold-500/10 transition-colors">
                    {manual.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 text-white/30">
                    {manual.category}
                  </span>
                </div>
                <h3 className="text-2xl font-black italic uppercase mb-3 leading-tight">{manual.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-8">{manual.description}</p>
              </div>

              <a
                href={manual.file}
                download
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-gold-500 hover:text-black hover:border-gold-500 font-black text-xs uppercase tracking-widest transition-all"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </a>
            </motion.div>
          ))}
        </div>

        <section className="mt-32 p-12 rounded-[50px] bg-gradient-to-br from-gold-500/10 to-transparent border border-white/5 flex flex-col items-center text-center">
            <h2 className="text-3xl font-black italic uppercase mb-4">Dúvidas Técnicas?</h2>
            <p className="text-white/40 max-w-xl mb-10">Nosso time de engenharia está pronto para auxiliar na configuração do seu sistema de automação residencial.</p>
            <Link to="/contact" className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                Falar com Engenharia
            </Link>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}} />
    </div>
  );
};

export default Downloads;



