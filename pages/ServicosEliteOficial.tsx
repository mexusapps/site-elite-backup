import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const ServicosEliteOficial: React.FC = () => {
  const { hash } = useLocation();

  const getActiveClasses = (id: string) => {
    const isActive = hash === `#${id}` || (hash === '' && id === 'automacao');
    return isActive 
      ? "flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all hover:scale-105"
      : "flex items-center gap-2 rounded-full border border-border-light bg-white px-5 py-2.5 text-sm font-medium text-text-light hover:border-primary hover:text-primary hover:bg-primary/5 transition-all dark:border-border-dark dark:bg-card-dark dark:text-text-dark dark:hover:text-primary";
  };

  return (
    <div className="container mx-auto w-full max-w-[1600px] px-4 md:px-12 py-8">

      {/* Menu Horizontal de Navegação (Fixo no Topo) */}
      <nav className="sticky top-[72px] z-30 mb-12 bg-background-light/95 backdrop-blur-sm dark:bg-background-dark/95 border-b border-border-light dark:border-border-dark py-4 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-xl md:border md:top-24 md:mb-16 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-start md:justify-center gap-3 md:gap-6 min-w-max pb-2 md:pb-0 px-2">
          <Link to="#automacao" className={getActiveClasses('automacao')}>
            <span className="material-symbols-outlined text-[20px]">home_iot_device</span>
            Automação
          </Link>
          <Link to="#audio-video" className={getActiveClasses('audio-video')}>
            <span className="material-symbols-outlined text-[20px]">speaker_group</span>
            Áudio & Vídeo
          </Link>
          <Link to="#som-ambiente" className={getActiveClasses('som-ambiente')}>
            <span className="material-symbols-outlined text-[20px]">surround_sound</span>
            Som Ambiente
          </Link>
          <Link to="#cameras" className={getActiveClasses('cameras')}>
            <span className="material-symbols-outlined text-[20px]">videocam</span>
            Câmeras
          </Link>
          <Link to="#redes" className={getActiveClasses('redes')}>
            <span className="material-symbols-outlined text-[20px]">router</span>
            Redes
          </Link>
          <Link to="#aspiracao" className={getActiveClasses('aspiracao')}>
            <span className="material-symbols-outlined text-[20px]">cyclone</span>
            Aspiração
          </Link>
        </div>
      </nav>

      {/* HeroSection */}
      <section className="flex flex-col items-center gap-6 py-4 text-center lg:py-8 lg:items-start lg:text-left mb-16">
        <div className="flex flex-col gap-2 max-w-4xl">
          <h1 className="text-4xl font-black leading-tight tracking-tighter text-text-light dark:text-text-dark md:text-5xl">
            Nossas Soluções de Tecnologia Integrada
          </h1>
          <h2 className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark md:text-lg max-w-3xl lg:whitespace-nowrap">
            Descubra como podemos transformar sua casa com automação, entretenimento e segurança de ponta.
          </h2>
        </div>
      </section>

      {/* Service Sections */}
      <div className="flex flex-col gap-16 md:gap-24 pb-16">

        {/* Automação */}
        <section id="automacao" className="scroll-mt-48 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="w-full h-[300px] md:h-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group">
            <img
              src="/elite_smart_home.png"
              alt="Automação Residencial Moderna"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark md:text-4xl">Automação Residencial</h3>
              <p className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark">
                Controle total da sua casa na palma da sua mão. Nossas soluções de automação residencial integram iluminação, climatização, cortinas e segurança em um sistema intuitivo e fácil de usar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">emoji_objects</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Conforto</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Crie cenários personalizados para cada momento.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">security</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Segurança</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Monitore e controle sua casa de qualquer lugar.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">bolt</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Eficiência</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Otimize o consumo de energia e reduza custos.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">mic</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Comando de Voz</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Integração total com Alexa e Google Assistente.</p>
                </div>
              </div>
            </div>
            <Link to="/quote" className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg shadow-primary/20">
              Saiba Mais
            </Link>
          </div>
        </section>

        {/* Áudio e Vídeo */}
        <section id="audio-video" className="scroll-mt-48 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="w-full h-[300px] md:h-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 md:order-last group">
            <img
              src="/elite_home_theater.png"
              alt="Áudio e Vídeo"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark md:text-4xl">Áudio e Vídeo</h3>
              <p className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark">
                Transforme sua casa em um centro de entretenimento com nossos sistemas de áudio e vídeo de alta fidelidade. Desfrute de som imersivo e imagem 4K em qualquer ambiente.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">volume_up</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Som de Alta Fidelidade</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Qualidade de som cristalina para uma experiência superior.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">4k</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Vídeo 4K</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Imagens nítidas para uma imersão cinematográfica.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">design_services</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Integração Total</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Sistemas perfeitamente integrados à estética da sua casa.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">speaker_group</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Som Ambiente</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Controle o som de toda casa do seu jeito.</p>
                </div>
              </div>
            </div>
            <Link to="/quote" className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg shadow-primary/20">
              Saiba Mais
            </Link>
          </div>
        </section>

        {/* Som Ambiente */}
        <section id="som-ambiente" className="scroll-mt-48 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="w-full h-[300px] md:h-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group">
            <img
              src="/elite_audio_system.png"
              alt="Controle de Som Ambiente pelo Celular"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark md:text-4xl">Som Ambiente</h3>
              <p className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark">
                Transforme a atmosfera da sua casa com um sistema de som de alta performance. Controle o áudio de todos os ambientes de forma independente ou simultânea, diretamente pelo seu celular. Qualidade sonora cristalina para suas festas, momentos de relaxamento ou para o seu comércio.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">smartphone</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Controle Total via App</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Gerencie o volume e as playlists de cada cômodo pelo smartphone.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">home_speaker</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Multiroom</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Toque a mesma música na casa toda ou sons diferentes em cada ambiente.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">store</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Soluções Comerciais</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Melhore a experiência do seu cliente com ambientação sonora profissional.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">visibility_off</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Design Discreto</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Caixas de embutir e equipamentos que se integram perfeitamente à decoração.</p>
                </div>
              </div>
            </div>
            <Link to="/quote" className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg shadow-primary/20">
              Saiba Mais
            </Link>
          </div>
        </section>



        {/* Câmeras */}
        <section id="cameras" className="scroll-mt-48 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="w-full h-[300px] md:h-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 md:order-last group">
            <img
              src="/elite_security_camera.png"
              alt="Câmeras de Segurança"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark md:text-4xl">Câmeras de Monitoramento</h3>
              <p className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark">
                Garanta a segurança da sua família e do seu patrimônio com nossas soluções de vigilância de última geração. Monitore tudo em tempo real, de onde estiver.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">smartphone</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Acesso Remoto</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Visualize suas câmeras ao vivo pelo celular.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">verified_user</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Tranquilidade</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Sinta-se seguro 24 horas por dia, 7 dias por semana.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">hd</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Gravação em Full HD</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Imagens nítidas para não perder nenhum detalhe.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">notifications_active</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Alertas Inteligentes</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Receba avisos de movimento no seu celular.</p>
                </div>
              </div>
            </div>
            <Link to="/quote" className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg shadow-primary/20">
              Saiba Mais
            </Link>
          </div>
        </section>

        {/* Redes */}
        <section id="redes" className="scroll-mt-48 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="w-full h-[300px] md:h-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 group">
            <img
              src="/elite_network_rack.png"
              alt="Redes Estruturadas"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark md:text-4xl">Redes Estruturadas</h3>
              <p className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark">
                Uma base sólida para sua casa conectada. Projetamos e implementamos redes de alta performance que garantem conectividade estável e veloz para todos os seus dispositivos.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">signal_cellular_alt</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Estabilidade</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Conexão confiável, sem quedas ou interrupções.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">speed</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Velocidade</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Aproveite o máximo da sua internet em toda a casa.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">lan</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Escalabilidade</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Rede preparada para o futuro e novos dispositivos.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">wifi_tethering</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Cobertura Total</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Sinal forte em todos os cômodos, sem pontos cegos.</p>
                </div>
              </div>
            </div>
            <Link to="/quote" className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg shadow-primary/20">
              Saiba Mais
            </Link>
          </div>
        </section>

        {/* Aspiração Central */}
        <section id="aspiracao" className="scroll-mt-48 grid items-center gap-8 md:grid-cols-2 md:gap-16">
          <div className="w-full h-[300px] md:h-[400px] aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 md:order-last group">
            <img
              src="/elite_vacuum_system.png"
              alt="Aspiração Central"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark md:text-4xl">Aspiração Central</h3>
              <p className="text-base font-normal leading-normal text-muted-light dark:text-muted-dark">
                Sistema avançado de limpeza que remove 100% da sujeira e ácaros, garantindo um ambiente mais saudável e silencioso para sua família.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">cleaning_services</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Higiene Superior</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Elimina micropartículas sem recircular poeira.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">volume_off</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Silêncio</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Motor isolado para uma limpeza sem ruídos.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">auto_awesome</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Praticidade</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Pontos de sucção estratégicos e mangueira leve.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined mt-1 text-primary">health_and_safety</span>
                <div>
                  <p className="font-medium text-text-light dark:text-text-dark">Saúde</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Ideal para alérgicos, com ar 100% puro.</p>
                </div>
              </div>
            </div>
            <Link to="/quote" className="mt-2 flex h-12 w-fit items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-white transition-all hover:bg-primary/90 hover:shadow-lg shadow-primary/20">
              Saiba Mais
            </Link>
          </div>
        </section>

      </div>

      {/* CTA Final */}
      <section className="flex flex-col items-center gap-6 rounded-2xl bg-primary/10 px-6 py-16 text-center dark:bg-primary/20 border border-primary/20">
        <div className="flex flex-col gap-2">
          <h3 className="text-3xl font-bold leading-tight tracking-tight text-text-light dark:text-text-dark">Pronto para transformar sua casa?</h3>
          <p className="mx-auto max-w-2xl text-base font-normal leading-normal text-muted-light dark:text-muted-dark">Entre em contato para uma consulta personalizada.</p>
        </div>
        <Link to="/quote" className="flex h-12 min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-8 text-base font-bold text-white transition-opacity hover:opacity-90 shadow-lg shadow-primary/30">
          <span className="truncate">Solicite um Orçamento</span>
        </Link>
      </section>
    </div>
  );
};

export default ServicosEliteOficial;
