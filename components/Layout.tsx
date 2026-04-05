
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  const isActive = (path: string) => location.pathname === path ? "text-[#f08519]" : "text-slate-600 dark:text-text-dark hover:text-[#f08519] dark:hover:text-[#f08519]";

  // Configuração do WhatsApp Flutuante (Atendimento Geral)
  const whatsappFloatingNumber = "5553999787885";
  const whatsappFloatingMessage = encodeURIComponent("Olá! Vim pelo site e gostaria de tirar algumas dúvidas.");
  const whatsappFloatingLink = `https://wa.me/${whatsappFloatingNumber}?text=${whatsappFloatingMessage}`;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-background-light/95 dark:bg-background-dark/95 px-6 py-4 backdrop-blur-sm">
        <div className="container mx-auto w-full max-w-[1600px] flex items-center justify-between px-4 md:px-12">
          <Link to="/" className="flex items-center gap-4" onClick={closeMenu}>
            <img
              src="/logo.png"
              alt="ELITE CASAS INTELIGENTES"
              className="h-10 md:h-14 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('fallback-logo');
                const fallback = document.createElement('span');
                fallback.className = 'text-xl font-black text-text-light dark:text-text-dark tracking-tighter';
                fallback.innerHTML = '<span class="text-primary">ELITE</span> CASAS INTELIGENTES';
                e.currentTarget.parentElement?.appendChild(fallback);
              }}
            />
          </Link>

          <div className="flex items-center justify-end gap-8">
            <nav className="hidden lg:flex items-center gap-9">
              <Link to="/" className={`text-sm font-medium leading-normal transition-colors ${isActive('/')}`}>Início</Link>
              <Link to="/services" className={`text-sm font-medium leading-normal transition-colors ${isActive('/services')}`}>Soluções</Link>
              <Link to="/partners" className={`text-sm font-medium leading-normal transition-colors ${isActive('/partners')}`}>Parceiros</Link>
              <Link to="/downloads" className={`text-sm font-medium leading-normal transition-colors ${isActive('/downloads')}`}>Manuais</Link>
              <Link to="/teste" className={`text-sm font-medium leading-normal transition-colors ${isActive('/teste')}`}>Painel Hub</Link>
              <Link to="/contact" className={`text-sm font-medium leading-normal transition-colors ${isActive('/contact')}`}>Contato</Link>
            </nav>
            <a
              href="https://instagram.com/elitecasasinteligentes"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center justify-center text-text-light dark:text-text-dark hover:text-primary transition-colors"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M18,5A1.5,1.5 0 0,1 19.5,6.5A1.5,1.5 0 0,1 18,8A1.5,1.5 0 0,1 16.5,6.5A1.5,1.5 0 0,1 18,5Z" />
              </svg>
            </a>
            <Link to="/quote" className="hidden md:flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-6 bg-[#f08519] text-white text-base font-black leading-normal tracking-tight hover:bg-opacity-90 transition-all shadow-lg active:scale-95">
              <span className="truncate">Solicitar Orçamento</span>
            </Link>

            {/* Mobile Menu Button */}
            <button onClick={toggleMenu} className="md:hidden p-2 text-text-light dark:text-text-dark">
              <span className="material-symbols-outlined text-3xl">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] z-40 bg-background-light dark:bg-background-dark p-6 flex flex-col gap-6 overflow-y-auto border-t border-border-light dark:border-border-dark">
          <Link to="/" onClick={closeMenu} className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark">Início</Link>
          <Link to="/services" onClick={closeMenu} className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark">Soluções</Link>
          <Link to="/partners" onClick={closeMenu} className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark">Parceiros</Link>
          <Link to="/downloads" onClick={closeMenu} className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark text-primary">Manuais Técnicos</Link>
          <Link to="/teste" onClick={closeMenu} className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark">Painel Hub</Link>
          <Link to="/contact" onClick={closeMenu} className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark">Contato</Link>
          <a
            href="https://instagram.com/elitecasasinteligentes"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-medium py-2 border-b border-border-light dark:border-border-dark flex items-center gap-2"
            onClick={closeMenu}
          >
            Instagram
          </a>
          <Link to="/quote" onClick={closeMenu} className="w-full flex items-center justify-center rounded-lg h-12 bg-primary text-white text-base font-bold">
            Solicitar Orçamento
          </Link>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-light dark:border-border-dark px-10 py-8 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
        <div className="container mx-auto w-full max-w-[1600px] flex flex-col md:flex-row justify-between items-center gap-6 px-4 md:px-12">
          <div className="flex flex-col gap-2 items-center md:items-start">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="ELITE CASAS INTELIGENTES"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('span');
                  fallback.className = 'font-bold text-text-light dark:text-text-dark';
                  fallback.innerText = 'ELITE CASAS INTELIGENTES';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
            </Link>
            <p className="text-sm text-muted-light dark:text-muted-dark">© {new Date().getFullYear()} Elite Casas Inteligentes. Todos os direitos reservados.</p>
          </div>

          {/* Indicador de Acesso Local */}
          <Link to="/teste" className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-primary text-[16px]">id_card</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Acesso Local: 192.168.1.94:3000</span>
          </Link>

          <div className="flex items-center gap-6 text-muted-light dark:text-muted-dark">
            <a href="#" className="hover:text-primary dark:hover:text-primary transition-colors">Termos de Serviço</a>
            <a href="#" className="hover:text-primary dark:hover:text-primary transition-colors">Política de Privacidade</a>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary"><span className="material-symbols-outlined text-lg">public</span></a>
              <a href="#" className="hover:text-primary"><span className="material-symbols-outlined text-lg">thumb_up</span></a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <div className="group fixed bottom-6 right-6 z-50">
        <a
          href={whatsappFloatingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-300 hover:scale-110"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-whatsapp" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
          </svg>
        </a>
        <div className="absolute bottom-full right-0 mb-2 hidden w-48 rounded-lg bg-gray-800 p-3 text-center text-sm text-white shadow-lg group-hover:block">
          Precisa de ajuda?
          <br />
          <strong><a href={whatsappFloatingLink} target="_blank" rel="noopener noreferrer" className="hover:underline">Fale conosco no WhatsApp!</a></strong>
        </div>
      </div>
    </div>
  );
};

export default Layout;
