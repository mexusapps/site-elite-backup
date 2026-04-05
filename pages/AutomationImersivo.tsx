import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import AutomationHub from '../components/AutomationHub';
import { CATEGORY_DETAILS, CategoryId } from '../data/categoryDetails';
import LightingDemo from '../components/demos/LightingDemo';

const AutomationImersivo: React.FC = () => {
  const [selectedId, setSelectedId] = useState<CategoryId | null>(null);

  const selectedCategory = selectedId ? CATEGORY_DETAILS[selectedId] : null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-white text-slate-950 font-sans selection:bg-[#ec7f13]/20 overflow-hidden z-[9999]">
      
      {/* Main Hub View */}
      <motion.div 
        animate={{ 
          scale: selectedId ? 0.95 : 1,
          opacity: selectedId ? 0 : 1,
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full h-full flex items-center justify-center p-4 min-[1600px]:p-12"
      >
        <AutomationHub onSelectCategory={(id) => setSelectedId(id as CategoryId)} />
      </motion.div>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedId && selectedCategory && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[10000] bg-white flex flex-col overflow-y-auto"
          >
            {/* 🏗️ MASTER LAYOUT */}
            <div className="w-full max-w-[1750px] mx-auto p-10 md:p-20">
              
              {/* 🏛️ HEADER: Editorial Style */}
              <header className="flex flex-col md:flex-row items-end justify-between gap-10 mb-20">
                <div className="flex flex-col gap-6 max-w-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-px w-16 bg-[#ec7f13]" />
                    <span className="text-sm font-black uppercase tracking-[0.4em] text-[#ec7f13]">
                      {selectedCategory.subtitle}
                    </span>
                  </div>
                  <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-slate-950 leading-[0.85] uppercase">
                    {selectedCategory.title}
                  </h1>
                </div>
                
                <button 
                  onClick={() => setSelectedId(null)}
                  className="group flex flex-col items-center gap-4 transition-all hover:scale-110 mb-4"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-[#ec7f13] transition-all">
                    <X size={32} className="text-slate-400 group-hover:text-[#ec7f13]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 group-hover:text-[#ec7f13]">FECHAR</span>
                </button>
              </header>

              <div className="flex flex-col lg:flex-row gap-20">
                {/* 📚 COLUMN 1: TEXTO */}
                <div className="w-full lg:w-1/3">
                  <div className="flex flex-col gap-12">
                    <div className="flex flex-col gap-8">
                      <div className="flex items-center gap-3">
                        <Info size={16} className="text-[#ec7f13]" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">MANIFESTO</span>
                      </div>
                      <p className="text-2xl font-medium text-slate-600 leading-relaxed">
                        {selectedCategory.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      {selectedCategory.items.map((item, i) => (
                        <div key={i} className="flex flex-col gap-3 p-8 rounded-[32px] bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl group">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 group-hover:bg-[#ec7f13] group-hover:text-white shadow-sm transition-all">
                            {React.cloneElement(item.icon as React.ReactElement, { size: 24 })}
                          </div>
                          <h4 className="text-lg font-black text-slate-950 uppercase tracking-tight">{item.title}</h4>
                          <p className="text-sm font-medium text-slate-500 leading-relaxed">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 🚀 COLUMN 2: INTERATIVIDADE */}
                <div className="flex-grow min-h-[600px]">
                  {selectedId === 'lighting' ? (
                    <LightingDemo />
                  ) : (
                    <div className="w-full h-full bg-slate-50 rounded-[40px] flex items-center justify-center border border-slate-100">
                      <span className="text-slate-300 font-black uppercase tracking-[0.5em]">Simulação em breve</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{ __html: `
        body { background: #000000 !important; overflow: hidden !important; margin: 0; padding: 0; }
        #root { height: 100vh; width: 100vw; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default AutomationImersivo;



