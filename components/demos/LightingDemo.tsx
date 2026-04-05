
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Palette, 
  Plus, 
  Minus,
  Check,
  Tv,
  Bed,
  Moon,
  Home,
  Info
} from 'lucide-react';

interface LightingDemoProps {
  title?: string;
  subtitle?: string;
  description?: string;
  items?: any[];
}

export default function LightingDemo({ title, subtitle, description, items }: LightingDemoProps) {
  const [lights, setLights] = useState([false, false]);
  const [dimmer, setDimmer] = useState(50);
  const [rgb, setRgb] = useState('#ec7f13'); // Elite Gold
  const [rgbDimmer, setRgbDimmer] = useState(100);
  const [activeScene, setActiveScene] = useState<string | null>(null);

  const applyScene = (scene: string) => {
    setActiveScene(scene);
    if (scene === 'cinema') {
      setLights([false, false]);
      setDimmer(15);
      setRgbDimmer(10);
      setRgb('#FF9500');
    } else if (scene === 'party') {
      setLights([true, true]);
      setDimmer(100);
      setRgbDimmer(100);
      setRgb('#0066FF');
    } else if (scene === 'relax') {
      setLights([true, false]);
      setDimmer(30);
      setRgbDimmer(40);
      setRgb('#ec7f13'); // Elite Gold
    }
  };

  const colorPresets = [
    { name: 'Red', hex: '#FF0000' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Orange', hex: '#FF8000' }
  ];

  return (
    <div className="w-full flex flex-col md:flex-row font-inter bg-white relative">
      
      {/* 🎮 CENTER: CONTROL CONSOLE */}
      <div className="w-full bg-white p-10 md:p-16 flex flex-col gap-10 relative z-20">
        
        {/* Group: Luzes On/Off */}
        <section className="flex flex-col gap-10">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-slate-950 text-white shadow-lg">
                    <Home size={18} />
                </div>
                <span className="text-base font-black uppercase tracking-[0.2em] text-slate-950">ILUMINAÇÃO GERAL</span>
            </div>
            <div className="grid grid-cols-1 gap-5">
                {[
                    { label: 'LUZ DA SALA', icon: <Tv size={20} /> },
                    { label: 'LUZ DO QUARTO', icon: <Bed size={20} /> }
                ].map((room, i) => {
                    const isOn = lights[i];
                    return (
                        <button
                            key={room.label}
                            onClick={() => {
                                const nl = [...lights];
                                nl[i] = !nl[i];
                                setLights(nl);
                                setActiveScene(null);
                            }}
                            className={`h-24 rounded-[32px] flex items-center px-10 gap-8 transition-all duration-300 border-2 relative ${
                                isOn 
                                ? 'bg-slate-950 border-slate-950 text-white shadow-xl' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isOn ? 'bg-gold-500 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                                {room.icon}
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                                <span className={`text-base font-black uppercase tracking-widest leading-none ${isOn ? 'text-white' : 'text-slate-950'}`}>{room.label}</span>
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isOn ? 'text-gold-400' : 'text-slate-600'}`}>
                                    {isOn ? 'LIGADO' : 'DESLIGADO'}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </section>

        {/* Unified Dimmer Section */}
        <section className="flex flex-col gap-14">
            
            {/* Sanca Dimmer */}
            <DimmerControl 
                label="SANCA (DIMMER)" 
                value={dimmer} 
                onChange={(val) => { setDimmer(val); setActiveScene(null); }}
                icon={<Sun size={20} className="text-slate-950" />}
            />

            {/* RGB Selection */}
            <div className="flex flex-col gap-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-slate-950 text-white shadow-lg">
                        <Palette size={18} />
                    </div>
                    <span className="text-base font-black uppercase tracking-[0.2em] text-slate-950">FITA DE LED RGBW</span>
                </div>
                <div className="flex flex-wrap gap-5 px-2">
                    {colorPresets.map((color) => (
                        <button 
                            key={color.hex}
                            onClick={() => { setRgb(color.hex); setActiveScene(null); }}
                            className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all hover:scale-110 shadow-lg border-2 ${rgb === color.hex ? 'border-slate-950 scale-110 ring-4 ring-gold-500/10' : 'border-white'}`}
                            style={{ backgroundColor: color.hex, width: '3.5rem', height: '3.5rem' }}
                        >
                            {rgb === color.hex && <Check size={28} className={color.hex === '#FFFFFF' ? 'text-slate-950' : 'text-white'} strokeWidth={5} />}
                        </button>
                    ))}
                    <div className="relative w-14 h-14 rounded-full border-2 border-white shadow-lg overflow-hidden flex items-center justify-center bg-slate-100 hover:scale-110 transition-transform" style={{ width: '3.5rem', height: '3.5rem' }}>
                        <Palette size={24} className="text-slate-400" />
                        <input type="color" value={rgb} onChange={(e) => {setRgb(e.target.value); setActiveScene(null); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150" />
                    </div>
                </div>

                {/* RGB Dimmer (Unified) */}
                <DimmerControl 
                    label="INTENSIDADE" 
                    value={rgbDimmer} 
                    onChange={(val) => { setRgbDimmer(val); setActiveScene(null); }}
                    isSmall
                />
            </div>
        </section>

        {/* Group: Cenários */}
        <section className="flex flex-col gap-6 mb-24">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-slate-950 text-white shadow-lg">
                    <Moon size={18} />
                </div>
                <span className="text-base font-black uppercase tracking-[0.2em] text-slate-950">CENÁRIOS INTELIGENTES</span>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {[
                    { id: 'cinema', label: 'MODO CINEMA' },
                    { id: 'party', label: 'MODO FESTA' },
                    { id: 'relax', label: 'MODO DESCANSO' }
                ].map((s) => (
                    <button
                        key={s.id}
                        onClick={() => applyScene(s.id)}
                        className={`h-16 rounded-[20px] border-2 flex items-center justify-center transition-all duration-300 font-black text-sm uppercase tracking-[0.4em] ${
                            activeScene === s.id ? 'bg-gold-500 border-gold-500 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-950 hover:border-slate-400 shadow-sm'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
        </section>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d3449; border-radius: 20px; }
        input[type=range]::-webkit-slider-thumb { appearance: none; width: 64px; height: 64px; cursor: pointer; }
      `}} />
    </div>
  );
}

/**
 * 🎚️ Unified Dimmer Control (ULTRA ROBUST)
 */
function DimmerControl({ label, value, onChange, icon, isSmall }: { label: string; value: number; onChange: (val: number) => void; icon?: React.ReactNode; isSmall?: boolean }) {
    return (
        <div className={`flex flex-col gap-6 ${!isSmall ? 'p-8 rounded-[40px] bg-slate-50 border-2 border-slate-100 shadow-lg' : ''}`}>
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    {icon && React.cloneElement(icon as any, { size: 20 })}
                    <span className="text-base font-black uppercase tracking-widest text-slate-950">{label}</span>
                </div>
                <span className="text-2xl font-black text-gold-600 font-mono italic tracking-tighter">{value}%</span>
            </div>
            
            <div className="flex items-center gap-6 py-2">
                <button 
                  onClick={() => onChange(Math.max(0, value - 10))} 
                  className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-950 hover:text-gold-600 shadow-lg border-2 border-slate-50 transition-all active:scale-95"
                >
                  <Minus size={24} strokeWidth={3} />
                </button>
                <div className="flex-grow h-14 relative flex items-center justify-center px-4">
                    <div className="absolute w-full h-[10px] bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <motion.div initial={false} animate={{ width: `${value}%` }} className="h-full bg-slate-950 shadow-lg" />
                    </div>
                    <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-full opacity-0 cursor-pointer z-20 relative" />
                    <motion.div 
                        animate={{ left: `calc(${value}% - 20px)` }} 
                        className="absolute w-10 h-10 bg-white border-[6px] border-slate-950 rounded-full shadow-xl pointer-events-none z-10" 
                        style={{ left: `calc(${value}% - 20px)` }} 
                    />
                </div>
                <button 
                  onClick={() => onChange(Math.min(100, value + 10))} 
                  className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-950 hover:text-gold-600 shadow-lg border-2 border-slate-50 transition-all active:scale-95"
                >
                  <Plus size={24} strokeWidth={3} />
                </button>
            </div>
            <p className="text-slate-600 text-[10px] font-black text-center uppercase tracking-[0.4em] opacity-80">DESLIZE PARA AJUSTAR O DIMMER</p>
        </div>
    );
}




