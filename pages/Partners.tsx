
import React, { useState } from 'react';

const Partners: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    setIsSubmitting(true);
    setSubmitError(false);
    setSubmitSuccess(false);

    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const company = formData.get('company') as string;

    // Configuração FormSubmit
    formData.append("_captcha", "false");
    formData.append("_template", "table");
    formData.append("_subject", `Nova Parceria: ${name} - ${company}`);

    try {
        const response = await fetch("https://formsubmit.co/ajax/eduardo@redeelite.com.br", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success === "true" || response.ok) {
            setSubmitSuccess(true);
            form.reset();
            
            // Redirecionamento para WhatsApp
            const whatsappNumber = "5553999787885";
            const message = encodeURIComponent(`Olá! Tenho interesse na parceria Elite. \n\nNome: ${name}\nEmpresa: ${company}`);
            window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');

        } else {
            setSubmitError(true);
        }
    } catch (error) {
        console.error("Erro ao enviar:", error);
        setSubmitError(true);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 md:gap-16 mt-8 pb-16">
      {/* Hero Section */}
      <section className="px-4 md:px-12">
        <div className="container mx-auto max-w-[1600px]">
          <div className="flex min-h-[50vh] md:min-h-[60vh] flex-col gap-6 bg-cover bg-center bg-no-repeat rounded-xl items-start justify-end px-6 pb-10 md:px-10" 
            style={{backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.7) 100%), url("/elite_partners_hero.png")'}}>
            <div className="flex flex-col gap-4 text-left max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 w-fit">
                <span className="material-symbols-outlined text-primary text-sm">handshake</span>
                <span className="text-primary text-xs font-bold uppercase tracking-wider">Área do Parceiro</span>
              </div>
              <h1 className="text-white text-3xl font-black leading-tight tracking-[-0.033em] md:text-5xl">
                Valorize seus Projetos com Tecnologia Inteligente
              </h1>
              <h2 className="text-white/90 text-base font-normal leading-normal md:text-lg max-w-4xl lg:whitespace-nowrap">
                Parceria exclusiva para Arquitetos, Engenheiros e Construtoras. Ofereça o diferencial da automação residencial sem dores de cabeça.
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-4 md:px-12">
        <div className="container mx-auto max-w-[1600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <h2 className="text-3xl font-bold text-text-light dark:text-text-dark leading-tight">
                Por que ser um parceiro Elite?
              </h2>
              <p className="text-muted-light dark:text-muted-dark text-lg">
                Sabemos que a tecnologia é cada vez mais exigida em projetos de alto padrão. Nossa missão é ser o seu braço técnico, garantindo que a infraestrutura esteja preparada para o futuro, evitando quebras de parede e retrabalhos.
              </p>
              <ul className="flex flex-col gap-4 mt-2">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-1">check_circle</span>
                  <div>
                    <strong className="block text-text-light dark:text-text-dark">Valorização do Imóvel</strong>
                    <span className="text-sm text-muted-light dark:text-muted-dark">Projetos preparados para automação têm maior valor de mercado.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-1">check_circle</span>
                  <div>
                    <strong className="block text-text-light dark:text-text-dark">Zero Dor de Cabeça</strong>
                    <span className="text-sm text-muted-light dark:text-muted-dark">Nós cuidamos de todo o projeto técnico, cabeamento e instalação.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-1">check_circle</span>
                  <div>
                    <strong className="block text-text-light dark:text-text-dark">Diferencial Competitivo</strong>
                    <span className="text-sm text-muted-light dark:text-muted-dark">Ofereça soluções inovadoras que encantam seus clientes.</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group">
               <img src="/elite_partner_meeting.png" alt="Reunião estratégica de parceiros Elite profissional" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
          </div>
        </div>
      </section>

      {/* Free Consulting Highlight */}
      <section className="px-4 md:px-12 bg-background-light dark:bg-card-dark py-12 md:py-16">
        <div className="container mx-auto max-w-none text-center flex flex-col gap-8">
          <span className="material-symbols-outlined text-6xl text-primary">design_services</span>
          <h2 className="text-3xl md:text-4xl font-black text-text-light dark:text-text-dark">
            Consultoria Gratuita para Parceiros
          </h2>
          <p className="text-lg text-muted-light dark:text-muted-dark">
            Para garantir o sucesso do seu empreendimento, oferecemos <strong>Consultoria de Infraestrutura Gratuita</strong> para nossos parceiros. Analisamos a planta baixa e projetamos toda a tubulação e cabeamento necessários para Áudio, Vídeo, Redes e Automação.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-6 rounded-lg bg-white dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="font-bold text-lg mb-2 text-text-light dark:text-text-dark">Análise de Planta</h3>
              <p className="text-sm text-muted-light dark:text-muted-dark">Identificamos os pontos ideais para sensores, caixas de som e roteadores.</p>
            </div>
            <div className="p-6 rounded-lg bg-white dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="font-bold text-lg mb-2 text-text-light dark:text-text-dark">Guia de Tubulação</h3>
              <p className="text-sm text-muted-light dark:text-muted-dark">Entregamos o mapa de conduítes para sua equipe de obra executar sem dúvidas.</p>
            </div>
            <div className="p-6 rounded-lg bg-white dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm">
              <h3 className="font-bold text-lg mb-2 text-text-light dark:text-text-dark">Acompanhamento</h3>
              <p className="text-sm text-muted-light dark:text-muted-dark">Suporte técnico durante a fase de infraestrutura para validar a execução.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Registration Form */}
      <section className="px-4 md:px-12">
        <div className="container mx-auto max-w-[1600px]">
          <div className="bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-8 md:p-12 shadow-lg">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">Seja um Parceiro Elite</h2>
              <p className="text-muted-light dark:text-muted-dark">Cadastre-se para ter acesso à consultoria gratuita e condições especiais para seus clientes.</p>
            </div>
            
            {submitSuccess ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Cadastro Enviado!</strong>
                    <span className="block mt-2">Recebemos seus dados e nossa equipe de parcerias entrará em contato em breve.</span>
                    <button onClick={() => setSubmitSuccess(false)} className="mt-4 underline text-sm">Novo cadastro</button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-light dark:text-text-dark">Nome Completo</label>
                    <input required name="name" type="text" className="rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark" placeholder="Seu nome" />
                    </div>
                    <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-light dark:text-text-dark">Empresa / Escritório</label>
                    <input required name="company" type="text" className="rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark" placeholder="Nome da empresa" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-light dark:text-text-dark">E-mail Corporativo</label>
                    <input required name="email" type="email" className="rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark" placeholder="seu@email.com" />
                    </div>
                    <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-light dark:text-text-dark">Telefone / WhatsApp</label>
                    <input required name="phone" type="tel" className="rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark" placeholder="(00) 00000-0000" />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-light dark:text-text-dark">Área de Atuação</label>
                    <select name="area" className="rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark">
                    <option value="">Selecione sua área</option>
                    <option value="Arquitetura">Arquitetura</option>
                    <option value="Engenharia Civil">Engenharia Civil</option>
                    <option value="Design de Interiores">Design de Interiores</option>
                    <option value="Construtora / Incorporadora">Construtora / Incorporadora</option>
                    <option value="Outro">Outro</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-light dark:text-text-dark">Mensagem (Opcional)</label>
                    <textarea name="message" rows={3} className="rounded-lg border border-border-light bg-background-light px-4 py-3 text-text-light focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-text-dark" placeholder="Conte um pouco sobre sua demanda atual..."></textarea>
                </div>
                
                {submitError && (
                    <div className="text-red-600 text-sm text-center">
                        Houve um erro ao enviar. Por favor, tente novamente.
                    </div>
                )}

                <button 
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary py-4 text-base font-bold text-white hover:bg-opacity-90 transition-opacity mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Enviando..." : "Solicitar Contato de Parceria"}
                </button>
                </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Partners;
