
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ENVIRONMENTS = [
  "Sala de Estar", "Sala de TV", "Sala de Jantar", "Cozinha", "Área Gourmet", 
  "Suíte Master", "Suíte 01", "Suíte 02", "Dormitório", "Banheiro", 
  "Lavabo", "Escritório", "Garagem", "Jardim / Área Externa", "Piscina"
];

const DetailedQuote: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string | null>('automacao');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    fone: '',
    email: '',
    origem: '',
    arquiteto: '',
    engenheiro: '',
    estagio: '',
    automacao: [] as string[],
    automacaoOutro: '',
    audioVideo: {
      homeTheater: [] as string[],
      homeTheaterOutro: '',
      somAmbiente: [] as string[],
      somAmbienteOutro: '',
      projetores: [] as string[],
      projetoresOutro: ''
    },
    seguranca: {
      cameras: [] as string[],
      camerasOutro: '',
      alarmes: [] as string[],
      alarmesOutro: ''
    },
    rede: {
      pontos: [] as string[],
      pontosOutro: '',
      wifi: [] as string[],
      wifiOutro: ''
    },
    arCondicionado: [] as string[],
    arCondicionadoOutro: '',
    cortinas: [] as string[],
    cortinasOutro: '',
    cenas: [] as string[],
    files: [] as File[]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (category: string, subcategory: string | null, value: string) => {
    setFormData(prev => {
      if (subcategory) {
        const current = (prev as any)[category][subcategory] as string[];
        const updated = current.includes(value) 
          ? current.filter((i: string) => i !== value) 
          : [...current, value];
        return { ...prev, [category]: { ...(prev as any)[category], [subcategory]: updated } };
      } else {
        const current = (prev as any)[category] as string[];
        const updated = current.includes(value) 
          ? current.filter((i: string) => i !== value) 
          : [...current, value];
        return { ...prev, [category]: updated };
      }
    });
  };

  const handleSubInputChange = (category: string, field: string, value: string) => {
    setFormData(prev => {
      if (category === 'root') {
        return { ...prev, [field]: value };
      }
      return { ...prev, [category]: { ...(prev as any)[category], [field]: value } };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, files: [...prev.files, ...selectedFiles] }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const nextStep = () => {
    if (step === 1) {
      const newErrors: Record<string, boolean> = {};
      if (!formData.nome) newErrors.nome = true;
      if (!formData.fone) newErrors.fone = true;
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 4000);
        return;
      }
    }
    setErrors({});
    setShowErrorPopup(false);
    setStep(prev => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call or FormSubmit integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);

      // Redirecionamento para WhatsApp (Opção 1)
      const whatsappNumber = "5553999787885";
      const message = encodeURIComponent(`Olá! Acabei de completar o formulário de orçamento detalhado no site.\n\nNome: ${formData.nome}`);
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');

    } catch (error) {
      console.error("Erro ao enviar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
        </div>
        <h1 className="text-3xl font-black text-text-light dark:text-text-dark">Solicitação Recebida!</h1>
        <p className="text-muted-light dark:text-muted-dark max-w-md">
          Obrigado pelo seu interesse. Nossa equipe irá analisar os detalhes do seu projeto e entraremos em contato em breve para apresentar uma proposta personalizada.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 bg-primary text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-opacity"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-background-dark py-10 px-4 relative">
      {/* Visual Error Popup - Minimalist Luxury Toast */}
      {showErrorPopup && (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-10 fade-in duration-500 max-w-xs w-full">
          <div className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-l-4 border-primary p-5 rounded-r-xl shadow-[0_15px_40px_rgba(0,0,0,0.1)] flex items-center gap-4 group">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl font-medium">info</span>
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-text-light/40 dark:text-text-dark/40 mb-0.5">Atenção</p>
              <p className="text-[13px] font-bold text-text-light dark:text-text-dark leading-tight">
                Nome e Telefone são campos obrigatórios.
              </p>
            </div>
            <button 
              onClick={() => setShowErrorPopup(false)} 
              className="text-muted-light/30 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto w-full max-w-[1600px] md:px-12">
        <div className="mb-10 text-center flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 mb-4">
             <img src="/logo.png" alt="Elite" className="h-12 w-auto" />
             <div className="h-10 w-[1px] bg-border-light"></div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-[0.2em] leading-none mb-1">Formulário</h2>
                <h2 className="text-xl font-black uppercase tracking-[0.2em] leading-none text-primary">Integração</h2>
             </div>
          </div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">Sua casa inteligente começa aqui</p>
        <h1 className="text-4xl font-black tracking-tight text-text-light dark:text-text-dark">Formulário de Integração</h1>
        <p className="text-muted-light dark:text-muted-dark font-medium lg:whitespace-nowrap">Sua casa inteligente começa aqui.</p>
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 pb-4 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${step === s ? 'bg-primary text-white scale-110 shadow-lg' : step > s ? 'bg-primary/40 text-white' : 'bg-border-light text-muted-light'}`}>
                {step > s ? <span className="material-symbols-outlined text-sm sm:text-base">check</span> : s}
              </div>
              {s < 5 && <div className={`h-1 w-4 sm:w-8 rounded transition-colors ${step > s ? 'bg-primary/40' : 'bg-border-light'}`}></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden">
        
        {/* Step 1: Identification */}
        {step === 1 && (
          <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label htmlFor="nome" className={`block text-sm font-bold transition-colors ${errors.nome ? 'text-red-500' : 'text-text-light dark:text-text-dark'}`}>Nome Completo *</label>
                <input 
                  id="nome"
                  required 
                  name="nome" 
                  value={formData.nome} 
                  onChange={handleInputChange} 
                  className={`w-full h-12 bg-background-light dark:bg-background-dark border rounded-lg px-4 focus:ring-2 focus:ring-primary outline-none transition-all ${errors.nome ? 'border-red-500 ring-1 ring-red-500' : 'border-border-light dark:border-border-dark'}`} 
                  placeholder="Nome completo" 
                />
                {errors.nome && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Campo obrigatório</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="fone" className={`block text-sm font-bold transition-colors ${errors.fone ? 'text-red-500' : 'text-text-light dark:text-text-dark'}`}>Fone *</label>
                <input 
                  id="fone"
                  required 
                  name="fone" 
                  value={formData.fone} 
                  onChange={handleInputChange} 
                  className={`w-full h-12 bg-background-light dark:bg-background-dark border rounded-lg px-4 focus:ring-2 focus:ring-primary outline-none transition-all ${errors.fone ? 'border-red-500 ring-1 ring-red-500' : 'border-border-light dark:border-border-dark'}`} 
                  placeholder="(00) 00000-0000" 
                />
                {errors.fone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Campo obrigatório</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-text-light dark:text-text-dark">E-mail *</label>
                <input id="email" required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full h-12 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-4 focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="exemplo@exemplo.com" />
              </div>
              
              <div className="space-y-4 col-span-2">
                <label className="text-sm font-bold text-text-light dark:text-text-dark">Onde nos encontrou?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["Amigos", "Redes Sociais", "Buscadores", "Outros"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 p-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark cursor-pointer transition-all hover:border-primary">
                      <input type="radio" name="origem" value={opt} checked={formData.origem === opt} onChange={handleInputChange} className="w-4 h-4 text-primary focus:ring-primary" />
                      <span className="text-sm font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="arquiteto" className="block text-sm font-bold text-text-light dark:text-text-dark">Arquiteto(a)</label>
                <input id="arquiteto" name="arquiteto" value={formData.arquiteto} onChange={handleInputChange} className="w-full h-12 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-4 focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label htmlFor="engenheiro" className="block text-sm font-bold text-text-light dark:text-text-dark">Engenheiro(a)</label>
                <input id="engenheiro" name="engenheiro" value={formData.engenheiro} onChange={handleInputChange} className="w-full h-12 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-4 focus:ring-2 focus:ring-primary outline-none transition-all" />
              </div>

              <div className="space-y-4 col-span-2">
                <label className="text-sm font-bold text-text-light dark:text-text-dark">Estágio da sua obra:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {["Projeto", "Fundação", "Laje", "Reboco", "Acabamentos", "Pronta"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 p-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark cursor-pointer transition-all hover:border-primary">
                      <input type="radio" name="estagio" value={opt} checked={formData.estagio === opt} onChange={handleInputChange} className="w-4 h-4 text-primary focus:ring-primary" />
                      <span className="text-xs font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4 col-span-2 pt-4 border-t border-border-light dark:border-border-dark">
                <label className="text-sm font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">attach_file</span>
                  Anexar Arquivos (Planta, Referências, etc.)
                </label>
                <div className="flex flex-col gap-4">
                  <div className="relative group">
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleFileChange} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-8 text-center group-hover:border-primary transition-colors bg-background-light/50 dark:bg-background-dark/50">
                      <span className="material-symbols-outlined text-4xl text-muted-light mb-2">cloud_upload</span>
                      <p className="text-sm font-medium">Arraste arquivos ou clique para selecionar</p>
                      <p className="text-[10px] text-muted-light mt-1 uppercase tracking-wider">PDF, PNG, JPG, DWG (Máx 10MB)</p>
                    </div>
                  </div>

                  {formData.files.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formData.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-primary text-sm">description</span>
                            <span className="text-xs font-medium truncate">{file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-600">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-light dark:border-border-dark mt-8">
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 text-red-500 animate-bounce">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <p className="text-xs font-bold uppercase tracking-widest">Preencha os campos obrigatórios (*)</p>
                </div>
              )}
              <div className="flex-1"></div>
              <button 
                type="button" 
                onClick={nextStep}
                className="bg-primary text-white h-14 px-10 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Automação Residencial */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-[#FFA500] text-white p-6 flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-widest">Automação Residencial</h3>
              <span className="material-symbols-outlined text-3xl">home_iot_device</span>
            </div>
            <div className="p-8 space-y-8">
              {/* Iluminação */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#FFA500] text-3xl">lightbulb</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-wider text-[#FFA500]">Iluminação Inteligente</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Conforto e Economia de Energia</p>
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl text-sm leading-relaxed text-muted-light dark:text-muted-dark border-l-4 border-[#FFA500]">
                  A automação de iluminação permite controlar lâmpadas e fitas de LED, criar cenas e programar horários, proporcionando conforto e sofisticação.
                </div>
                <p className="text-sm font-bold text-text-light dark:text-text-dark">Selecione os ambientes que deseja automatizar:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ENVIRONMENTS.map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={formData.automacao.includes(env)}
                        onChange={() => handleCheckboxChange('automacao', null, env)}
                        className="w-5 h-5 rounded border-border-light text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">{env}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-bold opacity-70">Outro ambiente:</label>
                  <input 
                    value={formData.automacaoOutro} 
                    onChange={(e) => handleSubInputChange('root', 'automacaoOutro', e.target.value)} 
                    className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-4 focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Ar Condicionado */}
              <div className="space-y-6 pt-8 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-3xl">ac_unit</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-wider text-blue-600 dark:text-blue-400">Ar Condicionado</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Controle Inteligente e Remoto</p>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl text-sm leading-relaxed text-blue-800 dark:text-blue-200 border-l-4 border-blue-500">
                  Controle seu ar condicionado de forma inteligente e remota. Programe horários de ligar e desligar, ajuste a temperatura ideal e economize energia.
                </div>
                <p className="text-sm font-bold text-text-light dark:text-text-dark">Selecione os ambientes que deseja automatizar:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ENVIRONMENTS.map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark cursor-pointer hover:border-blue-500 transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={formData.arCondicionado.includes(env)}
                        onChange={() => handleCheckboxChange('arCondicionado', null, env)}
                        className="w-5 h-5 rounded border-border-light text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">{env}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-bold opacity-70">Outro ambiente:</label>
                  <input 
                    value={formData.arCondicionadoOutro} 
                    onChange={(e) => handleSubInputChange('root', 'arCondicionadoOutro', e.target.value)} 
                    className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Cortinas e Persianas */}
              <div className="space-y-6 pt-8 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">blinds</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-wider text-green-600 dark:text-green-400">Cortinas e Persianas</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Conforto Térmico e Privacidade</p>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl text-sm leading-relaxed text-green-800 dark:text-green-200 border-l-4 border-green-500">
                  Controle a iluminação natural e sua privacidade com persianas automáticas. Abra e feche suas cortinas com um toque no celular ou comando de voz.
                </div>
                <p className="text-sm font-bold text-text-light dark:text-text-dark">Selecione os ambientes que deseja automatizar:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ENVIRONMENTS.map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark cursor-pointer hover:border-green-500 transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={formData.cortinas.includes(env)}
                        onChange={() => handleCheckboxChange('cortinas', null, env)}
                        className="w-5 h-5 rounded border-border-light text-green-500 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium">{env}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-bold opacity-70">Outro ambiente:</label>
                  <input 
                    value={formData.cortinasOutro} 
                    onChange={(e) => handleSubInputChange('root', 'cortinasOutro', e.target.value)} 
                    className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-4 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Cenas Integradas */}
              <div className="space-y-6 pt-8 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-3xl">collections_bookmark</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg uppercase tracking-wider text-amber-600 dark:text-amber-400">Cenas Personalizadas</h4>
                    <p className="text-[10px] font-bold opacity-60 uppercase">Controle de Múltiplos Dispositivos</p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl text-sm leading-relaxed text-amber-800 dark:text-amber-200 border-l-4 border-amber-500">
                  As cenas permitem controlar diversos dispositivos simultaneamente para criar o ambiente perfeito para cada momento (Bom Dia, Cinema, Festa, Tudo Desligado).
                </div>
                <p className="text-sm font-bold text-text-light dark:text-text-dark">Selecione as cenas que gostaria de ter:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["Bom Dia", "Cinema", "Festa", "Tudo Desligado"].map(cena => (
                    <label key={cena} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark cursor-pointer hover:border-amber-500 transition-colors group">
                      <input 
                        type="checkbox" 
                        checked={formData.cenas.includes(cena)}
                        onChange={() => handleCheckboxChange('cenas', null, cena)}
                        className="w-5 h-5 rounded border-border-light text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium">{cena}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="text-muted-light font-bold flex items-center gap-2">Voltar</button>
                <button type="button" onClick={() => setStep(3)} className="bg-[#FFA500] text-white h-12 px-10 rounded-lg font-bold">Próximo</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Áudio & Vídeo */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-[#8B4513] text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black uppercase tracking-widest">Áudio e Vídeo / Som Ambiente</h3>
                <span className="material-symbols-outlined text-3xl">speaker_group</span>
              </div>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-tighter">Escolha os sistemas que deseja integrar</p>
            </div>
            
            <div className="p-8 space-y-10">
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                São conjuntos de dispositivos que permitem reproduzir conteúdo de áudio e vídeo em alta qualidade, proporcionando uma experiência de entretenimento imersiva.
              </p>

              {/* Home Theater */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#8B4513]">
                  <span className="material-symbols-outlined font-bold">theaters</span>
                  <h4 className="font-black text-sm uppercase">Home Theater</h4>
                </div>
                <p className="text-[10px] text-muted-light leading-snug">
                  É um conjunto de dispositivos de áudio e vídeo que são integrados em um ambiente residencial para criar uma experiência de cinema em casa.
                </p>
                <p className="text-xs font-bold pt-2">HOME THEATER - Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Sala de cinema", "Sala TV", "Sala de estar", "Suíte Casal", "Suíte Filhos"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.audioVideo.homeTheater.includes(env)} onChange={() => handleCheckboxChange('audioVideo', 'homeTheater', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro lugar" 
                      value={formData.audioVideo.homeTheaterOutro} 
                      onChange={(e) => handleSubInputChange('audioVideo', 'homeTheaterOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              {/* Som Ambiente */}
              <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2 text-[#8B4513]">
                  <span className="material-symbols-outlined font-bold">surround_sound</span>
                  <h4 className="font-black text-sm uppercase">Som ambiente</h4>
                </div>
                <p className="text-[10px] text-muted-light leading-snug">
                  É um conjunto de alto-falantes distribuídos em diferentes áreas de uma residência, com o objetivo de proporcionar uma experiência sonora uniforme em todo o ambiente.
                </p>
                <p className="text-xs font-bold pt-2">Som ambiente - Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Sala TV", "Sala de estar", "Sala Jantar", "Lavabo", "Cozinha", "Espaço Gourmet", "Corredor inferior", "Piscina", "Churrasqueira", "Suíte Casal", "Suíte Filhos", "Corredor superior", "Banheiro Casal"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.audioVideo.somAmbiente.includes(env)} onChange={() => handleCheckboxChange('audioVideo', 'somAmbiente', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro lugar" 
                      value={formData.audioVideo.somAmbienteOutro} 
                      onChange={(e) => handleSubInputChange('audioVideo', 'somAmbienteOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              {/* Projetores */}
              <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2 text-[#8B4513]">
                  <span className="material-symbols-outlined font-bold">movie</span>
                  <h4 className="font-black text-sm uppercase">Projetores e Telas</h4>
                </div>
                <p className="text-xs font-bold pt-2">Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Sala de cinema", "Sala TV", "Sala de estar", "Suíte Casal", "Suíte Filhos"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.audioVideo.projetores.includes(env)} onChange={() => handleCheckboxChange('audioVideo', 'projetores', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro lugar" 
                      value={formData.audioVideo.projetoresOutro} 
                      onChange={(e) => handleSubInputChange('audioVideo', 'projetoresOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between">
                <button type="button" onClick={() => setStep(2)} className="text-muted-light font-bold flex items-center gap-2">Voltar</button>
                <button type="button" onClick={() => setStep(4)} className="bg-[#8B4513] text-white h-12 px-10 rounded-lg font-bold">Próximo</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Segurança */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-[#FF8C00] text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black uppercase tracking-widest">Câmeras de Monitoramento</h3>
                <span className="material-symbols-outlined text-3xl">videocam</span>
              </div>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-tighter">Que ambientes gostaria de monitorar?</p>
            </div>
            
            <div className="p-8 space-y-10">
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                As câmeras de monitoramento são uma importante ferramenta de segurança para usuários residenciais e comerciais, permitindo a visualização remota em tempo real.
              </p>

              {/* Câmeras */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#FF8C00]">
                  <span className="material-symbols-outlined font-bold">visibility</span>
                  <h4 className="font-black text-sm uppercase">Câmeras de Monitoramento</h4>
                </div>
                <p className="text-xs font-bold pt-2">Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Toda área externa", "Frente", "Fundos", "Lateral", "Sala TV", "Sala de estar", "Sala Jantar", "Lavabo", "Cozinha", "Lavanderia", "Closet", "Brinquedoteca", "Piscina", "Escritório", "Suíte Casal", "Suíte Filhos", "Corredor superior"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.seguranca.cameras.includes(env)} onChange={() => handleCheckboxChange('seguranca', 'cameras', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro" 
                      value={formData.seguranca.camerasOutro} 
                      onChange={(e) => handleSubInputChange('seguranca', 'camerasOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              {/* Alarmes */}
              <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2 text-[#FF8C00]">
                  <span className="material-symbols-outlined font-bold">security</span>
                  <h4 className="font-black text-sm uppercase">Sensores de Alarme</h4>
                </div>
                <p className="text-xs font-bold pt-2">Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {["Toda área externa", "Frente", "Fundos", "Lateral", "Sala TV", "Sala de estar", "Sala Jantar", "Lavabo", "Cozinha", "Lavanderia", "Closet", "Brinquedoteca", "Espaço Gourmet", "Corredor inferior", "Churrasqueira", "Piscina", "Escritório", "Suíte Casal", "Suíte Filhos", "Corredor superior"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.seguranca.alarmes.includes(env)} onChange={() => handleCheckboxChange('seguranca', 'alarmes', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro" 
                      value={formData.seguranca.alarmesOutro} 
                      onChange={(e) => handleSubInputChange('seguranca', 'alarmesOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between">
                <button type="button" onClick={() => setStep(3)} className="text-muted-light font-bold flex items-center gap-2">Voltar</button>
                <button type="button" onClick={() => setStep(5)} className="bg-[#FF8C00] text-white h-12 px-10 rounded-lg font-bold">Próximo</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Rede de Lógica */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-[#DAA520] text-white p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black uppercase tracking-widest">Rede de Lógica</h3>
                <span className="material-symbols-outlined text-3xl">router</span>
              </div>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-tighter">Selecione os ambientes desejados</p>
            </div>
            
            <div className="p-8 space-y-10">
              <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
                Cabeamento estruturado é um sistema de cabeamento organizado que interliga diferentes equipamentos de uma rede, como computadores, automação, som e câmeras.
              </p>

              {/* Rede Cabeada */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#DAA520]">
                  <span className="material-symbols-outlined font-bold">settings_ethernet</span>
                  <h4 className="font-black text-sm uppercase">Ponto de Internet Cabeada</h4>
                </div>
                <p className="text-xs font-bold pt-2">Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Espaço Gourmet", "Cozinha", "Sala de estar", "Corredor inferior", "Churrasqueira", "Ante-sala", "Escritório", "Suíte Casal", "Suíte Filhos", "Corredor superior"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.rede.pontos.includes(env)} onChange={() => handleCheckboxChange('rede', 'pontos', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro" 
                      value={formData.rede.pontosOutro} 
                      onChange={(e) => handleSubInputChange('rede', 'pontosOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              {/* Wi-Fi */}
              <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2 text-[#DAA520]">
                  <span className="material-symbols-outlined font-bold">wifi</span>
                  <h4 className="font-black text-sm uppercase">Cobertura Internet Wi-Fi</h4>
                </div>
                <p className="text-xs font-bold pt-2">Selecione os ambientes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Toda área interna", "Toda área externa", "Sala TV", "Sala de estar", "Sala Jantar", "Lavabos", "Cozinha", "Espaço Gourmet", "Corredor inferior", "Churrasqueira", "Piscina", "Área externa", "Suíte Casal", "Suíte Filhos", "Banheiro Casal", "Corredor superior"].map(env => (
                    <label key={env} className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-white dark:bg-card-dark cursor-pointer hover:border-primary transition-colors">
                      <input type="checkbox" checked={formData.rede.wifi.includes(env)} onChange={() => handleCheckboxChange('rede', 'wifi', env)} className="w-5 h-5 rounded border-border-light text-primary shadow-sm" />
                      <span className="text-xs font-medium">{env}</span>
                    </label>
                  ))}
                  <div className="col-span-2 sm:col-span-1">
                    <input 
                      placeholder="Outro" 
                      value={formData.rede.wifiOutro} 
                      onChange={(e) => handleSubInputChange('rede', 'wifiOutro', e.target.value)}
                      className="w-full h-11 bg-background-light dark:bg-background-dark border border-border-light rounded-lg px-3 text-xs outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-between">
                <button type="button" onClick={() => setStep(4)} className="text-muted-light font-bold flex items-center gap-2">Voltar</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-primary text-white h-14 px-12 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enviando...' : 'Finalizar Solicitação'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
      
      <p className="mt-8 text-center text-xs text-muted-light dark:text-muted-dark">
        Ao enviar este formulário, você concorda que nossa equipe utilize seus dados para entrar em contato referente ao orçamento solicitado.
      </p>
      </div>
    </div>
  );
};

export default DetailedQuote;
