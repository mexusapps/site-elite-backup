
import React, { useState } from 'react';

const Contact: React.FC = () => {
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

    // Configuração FormSubmit
    formData.append("_captcha", "false");
    formData.append("_template", "table");
    formData.append("_subject", `Novo Contato do Site: ${name}`);

    try {
      const response = await fetch("https://formsubmit.co/ajax/eduardo@redeelite.com.br", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (data.success === "true" || response.ok) {
        setSubmitSuccess(true);
        form.reset();

        // Redirecionamento para WhatsApp (Opção 1)
        const name = formData.get('name');
        const whatsappNumber = "5553999787885";
        const message = encodeURIComponent(`Olá! Acabei de enviar uma mensagem de contato pelo site.\n\nNome: ${name}`);
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
    <div className="container mx-auto w-full max-w-[1600px] px-4 md:px-12 py-16 sm:py-24">
      <div className="flex flex-col gap-12 lg:gap-16">
        {/* PageHeading */}
        <div className="flex flex-col items-center text-center gap-3">
          <p className="text-4xl font-black tracking-tighter text-text-light dark:text-text-dark sm:text-5xl">Fale com um Especialista</p>
          <p className="max-w-4xl text-base text-muted-light dark:text-muted-dark lg:whitespace-nowrap">Preencha o formulário abaixo ou utilize um de nossos canais de atendimento. Estamos prontos para transformar sua casa.</p>
        </div>

        {/* Contact Section */}
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-5 lg:gap-8">
          {/* Left Column: Contact Info */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Address */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-border-light dark:bg-card-dark text-text-light dark:text-text-dark">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <div className="flex flex-col">
                <p className="text-base font-medium text-text-light dark:text-text-dark">Endereço</p>
                <p className="text-sm text-muted-light dark:text-muted-dark">Av. Pres. João Goulart, 4021</p>
                <a className="mt-1 text-sm font-medium text-primary hover:underline" href="https://www.google.com/maps/search/?api=1&query=Av.+Pres.+João+Goulart,+4021" target="_blank" rel="noopener noreferrer">Ver no mapa</a>
              </div>
            </div>
            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-border-light dark:bg-card-dark text-text-light dark:text-text-dark">
                <span className="material-symbols-outlined text-2xl">call</span>
              </div>
              <div className="flex flex-col">
                <p className="text-base font-medium text-text-light dark:text-text-dark">Telefone</p>
                <p className="text-sm text-muted-light dark:text-muted-dark">+55 (53) 98403-6674</p>
                <a className="mt-1 text-sm font-medium text-primary hover:underline" href="https://wa.me/5553984036674" target="_blank" rel="noopener noreferrer">Ligar agora</a>
              </div>
            </div>
            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-border-light dark:bg-card-dark text-text-light dark:text-text-dark">
                <span className="material-symbols-outlined text-2xl">mail</span>
              </div>
              <div className="flex flex-col">
                <p className="text-base font-medium text-text-light dark:text-text-dark">E-mail</p>
                <p className="text-sm text-muted-light dark:text-muted-dark">eduardo@redeelite.com.br</p>
                <a className="mt-1 text-sm font-medium text-primary hover:underline" href="mailto:eduardo@redeelite.com.br">Enviar e-mail</a>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 sm:p-8 lg:col-span-3">
            {submitSuccess ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Mensagem enviada com sucesso!</strong>
                <span className="block mt-2">Recebemos sua mensagem e entraremos em contato em breve.</span>
                <button onClick={() => setSubmitSuccess(false)} className="mt-4 underline text-sm">Enviar nova mensagem</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark" htmlFor="name">Nome Completo</label>
                  <div className="mt-2">
                    <input required autoComplete="name" className="block w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark py-2.5 px-3.5 text-sm text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:ring-2 focus:ring-inset focus:ring-primary" id="name" name="name" placeholder="Seu nome" type="text" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark" htmlFor="email">E-mail</label>
                  <div className="mt-2">
                    <input required autoComplete="email" className="block w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark py-2.5 px-3.5 text-sm text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:ring-2 focus:ring-inset focus:ring-primary" id="email" name="email" placeholder="seu.email@exemplo.com" type="email" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark" htmlFor="phone">Telefone / WhatsApp</label>
                  <div className="mt-2">
                    <input required autoComplete="tel" className="block w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark py-2.5 px-3.5 text-sm text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:ring-2 focus:ring-inset focus:ring-primary" id="phone" name="phone" placeholder="(00) 90000-0000" type="tel" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark" htmlFor="message">Sua Mensagem</label>
                  <div className="mt-2">
                    <textarea required className="block w-full rounded-lg border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark py-2.5 px-3.5 text-sm text-text-light dark:text-text-dark placeholder:text-muted-light dark:placeholder:text-muted-dark focus:ring-2 focus:ring-inset focus:ring-primary" id="message" name="message" placeholder="Como podemos ajudar?" rows={4}></textarea>
                  </div>
                </div>

                {submitError && (
                  <div className="text-red-600 text-sm">Erro ao enviar mensagem. Tente novamente.</div>
                )}

                <div className="mt-2">
                  <button
                    disabled={isSubmitting}
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
                    type="submit"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
