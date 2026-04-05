import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HomeOriginal: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleQuickLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    // FormSubmit Configuration
    formData.append("_captcha", "false");
    formData.append("_template", "table");
    formData.append("_subject", `Novo Contato Rápido: ${formData.get('Nome_Lead')}`);

    try {
      const response = await fetch("https://formsubmit.co/ajax/eduardo@redeelite.com.br", {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        setSubmitSuccess(true);
        form.reset();
      }
    } catch (error) {
      console.error("Erro ao enviar lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-16 md:gap-24 mb-20 px-4 md:px-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-2xl">
        <div className="mx-auto max-w-[1600px] px-6 py-16 md:px-12 md:py-24 lg:flex lg:items-center lg:gap-x-12">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <div className="flex">
              <div className="relative flex items-center gap-x-4 rounded-full px-4 py-1 text-sm leading-6 text-primary ring-1 ring-primary/20 hover:ring-primary/40 transition-all font-bold uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                Automação de Alto Padrão
              </div>
            </div>
            <h1 className="mt-8 text-5xl font-black tracking-tight text-text-light dark:text-text-dark sm:text-7xl">
              Sua casa com <span className="text-primary italic">Inteligência </span> Atmosférica.
            </h1>
            <p className="mt-8 text-lg leading-8 text-muted-light dark:text-muted-dark font-medium">
              Transformamos residências em ecossistemas inteligentes, onde o conforto, a segurança e a economia convergem em uma única experiênca de elite.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <button 
                onClick={() => navigate('/quote')}
                className="rounded-xl bg-primary px-8 py-4 text-base font-black text-white shadow-xl shadow-primary/30 hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Solicitar Orçamento
              </button>
              <button 
                onClick={() => navigate('/services')}
                className="text-base font-bold leading-6 text-text-light dark:text-text-dark hover:text-primary transition-colors flex items-center gap-2"
              >
                Ver Serviços <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          
          {/* Quick Lead Form */}
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:flex-shrink-0 lg:flex-grow">
             <div className="relative mx-auto max-w-sm rounded-[2rem] border border-border-light dark:border-border-dark bg-white dark:bg-background-dark p-8 shadow-2xl ring-1 ring-black/5">
                <div className="absolute -top-4 -right-4 h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
                   <span className="material-symbols-outlined text-white">bolt</span>
                </div>
                <h3 className="text-xl font-black text-text-light dark:text-text-dark mb-2">Início Rápido</h3>
                <p className="text-xs font-bold text-muted-light dark:text-muted-dark uppercase tracking-widest mb-6 opacity-60">Nós ligamos para você</p>
                
                {submitSuccess ? (
                  <div className="py-12 text-center animate-in zoom-in">
                    <span className="material-symbols-outlined text-green-500 text-6xl mb-4">check_circle</span>
                    <p className="font-bold text-text-light dark:text-text-dark">Entraremos em contato!</p>
                  </div>
                ) : (
                  <form onSubmit={handleQuickLead} className="flex flex-col gap-4">
                    <input required name="Nome_Lead" className="h-12 w-full rounded-xl border border-border-light bg-background-light dark:border-border-dark dark:bg-card-dark px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="Seu Nome" />
                    <input required name="E-mail" type="email" className="h-12 w-full rounded-xl border border-border-light bg-background-light dark:border-border-dark dark:bg-card-dark px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="Seu E-mail" />
                    <button 
                      disabled={isSubmitting}
                      className="mt-2 w-full h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-70 transition-all font-bold"
                    >
                      {isSubmitting ? "Enviando..." : "Quero ser Elite"}
                    </button>
                  </form>
                )}
             </div>
          </div>
        </div>
      </section>

      {/* Services Grid Snapshot */}
      <section className="mx-auto w-full max-w-[1600px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { title: 'Automação', icon: 'home_iot_device', desc: 'Controle total na palma da sua mão.' },
             { title: 'Home Cinema', icon: 'theaters', desc: 'Experiência imersiva de cinema em casa.' },
             { title: 'Redes de Elite', icon: 'router', desc: 'Conectividade máxima e estabilidade total.' },
           ].map((s, i) => (
             <div key={i} className="group p-8 rounded-3xl bg-white dark:bg-card-dark border border-border-light dark:border-border-dark hover:border-primary transition-all hover:shadow-2xl hover:-translate-y-2">
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

export default HomeOriginal;
