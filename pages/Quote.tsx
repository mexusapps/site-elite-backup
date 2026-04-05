import React, { useState, useRef } from 'react';

const Quote: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState(false);
    const [fileNames, setFileNames] = useState<string[]>([]);
    const formRef = useRef<HTMLFormElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const names = Array.from(e.target.files).map(file => file.name);
            setFileNames(names);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        setIsSubmitting(true);
        setSubmitError(false);

        const formData = new FormData(form);
        
        // Configuração para o FormSubmit
        formData.append("_captcha", "false");
        formData.append("_template", "table");
        formData.append("_subject", `Solicitação de Orçamento: ${formData.get('Nome_Completo')}`);

        try {
            const response = await fetch("https://formsubmit.co/ajax/eduardo@redeelite.com.br", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                setSubmitSuccess(true);
                form.reset();
                setFileNames([]);
            } else {
                setSubmitError(true);
            }
        } catch (error) {
            console.error("Erro ao enviar orçamento:", error);
            setSubmitError(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-12 md:gap-16 mt-8 pb-16 px-4 md:px-12">
            <div className="mx-auto w-full max-w-[1600px]">
                <div className="flex flex-col gap-4 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="h-[2px] w-12 bg-primary"></div>
                        <h2 className="text-xl font-black uppercase tracking-[0.2em] leading-none text-primary">Orçamento</h2>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-text-light dark:text-text-dark">Solicite uma Estimativa</h1>
                    <p className="text-muted-light dark:text-muted-dark text-lg font-medium max-w-2xl">
                        Conte-nos sobre seu projeto e nossa equipe retornará com uma análise técnica em até 24h.
                    </p>
                </div>

                {submitSuccess ? (
                    <div className="bg-white dark:bg-card-dark rounded-xl border-2 border-primary/20 p-12 text-center animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
                        </div>
                        <h3 className="text-2xl font-black text-text-light dark:text-text-dark mb-2">Solicitação Enviada!</h3>
                        <p className="text-muted-light dark:text-muted-dark mb-8">Recebemos seus dados. Entraremos em contato em breve.</p>
                        <button onClick={() => setSubmitSuccess(false)} className="text-primary font-bold uppercase tracking-widest text-sm hover:underline">Enviar outro orçamento</button>
                    </div>
                ) : (
                    <form onSubmit={handleEmailSubmit} className="flex w-full flex-col gap-8 rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-sm sm:p-8">
                        
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">1. Informações de Contato</h3>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark ml-1">Nome Completo</span>
                                    <input required name="Nome_Completo" className="w-full h-12 rounded-lg border border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark px-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Seu nome" type="text" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark ml-1">E-mail</span>
                                    <input required name="E-mail" className="w-full h-12 rounded-lg border border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark px-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary" placeholder="seu@email.com" type="email" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark ml-1">WhatsApp / Telefone</span>
                                    <input required name="WhatsApp" className="w-full h-12 rounded-lg border border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark px-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary" placeholder="(00) 00000-0000" type="tel" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium text-text-light dark:text-text-dark ml-1">Cidade / Estado</span>
                                    <input required name="Cidade_Estado" className="w-full h-12 rounded-lg border border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark px-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Ex: Pelotas, RS" type="text" />
                                </label>
                            </div>
                        </div>

                        <div className="w-full border-t border-dashed border-border-light dark:border-border-dark"></div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">2. Detalhes do Imóvel</h3>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-medium text-text-light dark:text-text-dark ml-1">Tipo de Imóvel</legend>
                                    <div className="flex gap-4">
                                        <label className="flex-1 flex items-center justify-center gap-2 h-12 border border-border-light dark:border-border-dark rounded-lg cursor-pointer bg-background-light dark:bg-background-dark has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                                            <input name="Tipo_de_Imovel" type="radio" value="Residencial" className="w-4 h-4 text-primary" defaultChecked />
                                            <span className="text-sm">Residencial</span>
                                        </label>
                                        <label className="flex-1 flex items-center justify-center gap-2 h-12 border border-border-light dark:border-border-dark rounded-lg cursor-pointer bg-background-light dark:bg-background-dark has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                                            <input name="Tipo_de_Imovel" type="radio" value="Comercial" className="w-4 h-4 text-primary" />
                                            <span className="text-sm">Comercial</span>
                                        </label>
                                    </div>
                                </fieldset>
                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-medium text-text-light dark:text-text-dark ml-1">Fase do Projeto</legend>
                                    <select name="Fase_do_Projeto" className="w-full h-12 rounded-lg border border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark px-4 outline-none focus:border-primary">
                                        <option value="Planejamento">Planejamento</option>
                                        <option value="Construção">Construção</option>
                                        <option value="Reforma">Reforma</option>
                                        <option value="Imóvel Pronto">Imóvel Pronto</option>
                                    </select>
                                </fieldset>
                            </div>
                        </div>

                        <div className="w-full border-t border-dashed border-border-light dark:border-border-dark"></div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">3. Serviços de Interesse</h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <label className="flex flex-col items-center justify-center gap-3 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-light dark:bg-background-dark cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary text-center group">
                                    <input name="Interesse_Automacao" type="checkbox" value="Sim" className="hidden" />
                                    <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">home_iot_device</span>
                                    <span className="text-xs font-bold uppercase tracking-tight">Automação Residencial</span>
                                </label>
                                <label className="flex flex-col items-center justify-center gap-3 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-light dark:bg-background-dark cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary text-center group">
                                    <input name="Interesse_Audio_Video" type="checkbox" value="Sim" className="hidden" />
                                    <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">speaker_group</span>
                                    <span className="text-xs font-bold uppercase tracking-tight">Áudio e Vídeo</span>
                                </label>
                                <label className="flex flex-col items-center justify-center gap-3 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-light dark:bg-background-dark cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary text-center group">
                                    <input name="Interesse_Seguranca" type="checkbox" value="Sim" className="hidden" />
                                    <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">videocam</span>
                                    <span className="text-xs font-bold uppercase tracking-tight">Segurança Inteligente</span>
                                </label>
                                <label className="flex flex-col items-center justify-center gap-3 p-4 border border-border-light dark:border-border-dark rounded-xl bg-background-light dark:bg-background-dark cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary text-center group">
                                    <input name="Interesse_Redes_WIFI" type="checkbox" value="Sim" className="hidden" />
                                    <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">router</span>
                                    <span className="text-xs font-bold uppercase tracking-tight">Redes de Lógica</span>
                                </label>
                            </div>
                        </div>

                        <div className="w-full border-t border-dashed border-border-light dark:border-border-dark"></div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">4. Detalhes Adicionais</h3>
                            <label className="flex flex-col gap-2">
                                <span className="text-sm font-medium text-text-light dark:text-text-dark ml-1">Descrição do Pedido</span>
                                <textarea name="Mensagem_Adicional" className="w-full h-32 py-3 px-4 rounded-lg border border-border-light bg-background-light dark:border-border-dark dark:bg-background-dark outline-none focus:border-primary resize-none" placeholder="Descreva brevemente o que você busca..."></textarea>
                            </label>
                            <div className="flex flex-col items-center gap-4">
                                <label className="w-full h-32 border-2 border-dashed border-border-light dark:border-border-dark rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-background-light/50 dark:bg-background-dark/50">
                                    <span className="material-symbols-outlined text-3xl text-muted-light dark:text-muted-dark">cloud_upload</span>
                                    <span className="mt-2 text-xs font-bold uppercase tracking-widest text-text-light dark:text-text-dark">
                                        {fileNames.length > 0 ? `${fileNames.length} arquivos selecionados` : "Clique para anexar plantas ou fotos"}
                                    </span>
                                    <input name="Anexos" multiple type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>

                        {submitError && (
                            <div className="text-red-600 text-sm font-bold text-center">Houve um erro ao enviar. Tente novamente.</div>
                        )}

                        <button 
                            disabled={isSubmitting}
                            className="w-full h-14 bg-primary text-white text-base font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                            type="submit"
                        >
                            {isSubmitting ? "Enviando..." : "Solicitar Orçamento"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Quote;
