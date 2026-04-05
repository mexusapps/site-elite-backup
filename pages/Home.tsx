import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-16 md:gap-24 mb-20 px-4 md:px-12 bg-white dark:bg-background-dark">
      {/* Hero Section - Reconstructed from Screenshot */}
      <section className="relative w-full max-w-[1600px] mx-auto overflow-hidden rounded-[32px] min-h-[600px] md:min-h-[720px] group shadow-2xl border border-black/5">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 transition-transform duration-1000 group-hover:scale-105">
          <img 
            src="/elite_hero_house.png" 
            alt="Elite Modern Architecture" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/elite_smart_home.png"; // Fallback image
            }}
          />
          {/* Custom Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-8 md:px-20" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center max-w-4xl py-20 px-8 md:px-20">
          <h1 className="text-white text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 animate-in slide-in-from-left duration-700">
            Transforme <br />
            Seu Lar com <br />
            <span className="text-primary italic">Tecnologia</span> <br />
            Inteligente
          </h1>
          <p className="text-white/90 text-lg md:text-2xl font-medium max-w-xl mb-12 leading-relaxed animate-in slide-in-from-left duration-1000 delay-150">
            Criamos casas inteligentes, conectadas e seguras, adaptadas ao seu estilo de vida.
          </p>
          <div className="flex flex-wrap gap-6 animate-in slide-in-from-bottom duration-1000 delay-300">
            <button 
              onClick={() => navigate('/quote')}
              className="px-10 py-5 bg-primary text-white text-xl font-black rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 hover:bg-opacity-90 active:scale-95 transition-all uppercase tracking-tight"
            >
              Receba um Orçamento
            </button>
          </div>
        </div>
      </section>

      {/* Services Grid Snapshot - Re-aligned with the premium look */}
      <section className="mx-auto w-full max-w-[1600px] py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
           {[
             { title: 'Automação', icon: 'home_iot_device', desc: 'Controle total da sua residência na palma da sua mão.' },
             { title: 'Home Cinema', icon: 'theaters', desc: 'Experiência imersiva com tecnologia de áudio e vídeo de ponta.' },
             { title: 'Redes de Elite', icon: 'router', desc: 'Conectividade máxima com estabilidade e segurança total.' },
           ].map((s, i) => (
             <div key={i} className="group p-10 rounded-[40px] bg-white dark:bg-card-dark border border-black/5 hover:border-primary/30 transition-all hover:shadow-2xl hover:-translate-y-2">
                <div className="h-20 w-20 rounded-[24px] bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                   <span className="material-symbols-outlined text-4xl">{s.icon}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">{s.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{s.desc}</p>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
