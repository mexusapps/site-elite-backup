import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeProposal: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-16 md:gap-24 mb-20 px-4 md:px-12">
      {/* 🚀 ORIGINAL HERO SECTION (RESTORED) */}
      <section className="relative w-full h-[600px] md:h-[700px] overflow-hidden rounded-[2.5rem] shadow-2xl border border-border-light dark:border-border-dark mt-4">
        {/* Background Image from Original Screenshot */}
        <img 
          src="/elite_smart_home.png" 
          alt="Elite Smart Home" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-black/40 bg-gradient-to-r from-black/60 to-transparent" /> 
        
        <div className="relative h-full flex flex-col justify-center px-8 md:px-20 max-w-5xl">
          <div className="animate-in fade-in slide-in-from-left duration-1000">
            <h1 className="text-4xl md:text-7xl min-[1600px]:text-8xl font-black text-white leading-[1.1] tracking-tight mb-8">
              Transforme Seu Lar com <br/> 
              <span className="text-primary italic">Tecnologia Inteligente</span>
            </h1>
            
            <p className="text-lg md:text-2xl text-white/90 font-medium mb-12 max-w-2xl leading-relaxed">
              Criamos casas inteligentes, conectadas e seguras, <br className="hidden md:block" /> 
              adaptadas ao seu estilo de vida e necessidades.
            </p>
            
            <div className="flex flex-wrap gap-6">
              <button 
                onClick={() => navigate('/quote')}
                className="group relative overflow-hidden bg-primary px-10 py-5 rounded-2xl text-lg font-black text-white shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
              >
                <span className="relative z-10 flex items-center gap-2 uppercase tracking-widest">
                  Receba um Orçamento
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Snapshot (Keeping current components for reference) */}
      <section className="mx-auto w-full max-w-[1600px] py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { title: 'Automação', icon: 'home_iot_device', desc: 'Controle total na palma da sua mão.' },
             { title: 'Home Cinema', icon: 'theaters', desc: 'Experiência imersiva de cinema em casa.' },
             { title: 'Redes de Elite', icon: 'router', desc: 'Conectividade máxima e estabilidade total.' },
           ].map((s, i) => (
             <div key={i} className="group p-8 rounded-3xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark hover:border-primary transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                   <span className="material-symbols-outlined text-3xl">{s.icon}</span>
                </div>
                <h3 className="text-xl font-black text-text-light dark:text-text-dark mb-2">{s.title}</h3>
                <p className="text-muted-light dark:text-muted-dark font-medium">{s.desc}</p>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};

export default HomeProposal;
