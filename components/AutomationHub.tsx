import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  Wind, 
  Blinds, 
  Activity, 
  Zap, 
  Lock, 
  Play,
  Music,
  Shield,
  Droplets,
  Cpu
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CategoryId = 'lighting' | 'climate' | 'blinds' | 'sensors' | 'access' | 'scenes' | 'media' | 'scheduling' | 'security' | 'irrigation';

interface HubCategory {
  id: CategoryId;
  name: string;
  icon: React.ReactNode;
  color: string;
  systems: string[];
}

const CATEGORIES: HubCategory[] = [
  { id: 'lighting', name: 'Iluminação', icon: <Lightbulb />, color: '#00daf3', systems: ['On/Off', 'Dimmer', 'RGBW'] },
  { id: 'climate', name: 'Climatização', icon: <Wind />, color: '#00daf3', systems: ['A/C', 'Piso Térmico'] },
  { id: 'security', name: 'Segurança', icon: <Shield />, color: '#00daf3', systems: ['CFTV', 'Alarme'] },
  { id: 'scenes', name: 'Cenários', icon: <Play />, color: '#ffe2ab', systems: ['Cinema', 'Festa', 'Sair'] },
  { id: 'scheduling', name: 'Agendamentos', icon: <Zap />, color: '#00daf3', systems: ['Horários', 'Solar'] },
  { id: 'blinds', name: 'Persianas', icon: <Blinds />, color: '#00daf3', systems: ['Somfy', 'Blackout'] },
  { id: 'access', name: 'Acessos', icon: <Lock />, color: '#00daf3', systems: ['Biometria', 'Garagem'] },
  { id: 'media', name: 'Som & Vídeo', icon: <Music />, color: '#ffe2ab', systems: ['Home Theater', 'Som Ambiente'] },
];

export default function AutomationHub({ onSelectCategory }: { onSelectCategory: (id: CategoryId) => void }) {
  const [hoveredId, setHoveredId] = useState<CategoryId | null>(null);

  const width = 1920; 
  const height = 1080;
  const hubX = width / 2;
  const hubY = height / 2;

  const getPosition = (index: number) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    
    let xOffset = col * 340 - 340;
    
    if (row === 2) {
      xOffset = (index % 2) * 340 - 170;
    }

    return {
      x: hubX + xOffset,
      y: hubY + (row * 220 - 220)
    };
  };

  return (
    <div className="relative w-full h-full bg-[#0b1326] overflow-hidden font-jakarta">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,218,243,0.05)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="absolute inset-0 w-full h-full z-10 overflow-visible" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="animate-hub-pulse">
           <circle cx={hubX} cy={hubY} r="180" fill="url(#coreGradient)" className="opacity-10 blur-[80px]" />
        </g>
        
        <defs>
           <radialGradient id="coreGradient">
              <stop offset="0%" stopColor="#00daf3" />
              <stop offset="100%" stopColor="transparent" />
           </radialGradient>
        </defs>

        <g>
          <circle cx={hubX} cy={hubY} r="180" fill="url(#coreGradient)" className="opacity-10 blur-[100px]" />
          
          <foreignObject x={hubX - 400} y={hubY - 400} width="800" height="800" className="overflow-visible">
            <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
              <h2 className="text-[32px] font-extrabold tracking-[0.5em] text-[#00daf3] leading-none uppercase mb-6 pl-[0.5em] font-manrope">
                ELITE
              </h2>

              <div className="relative mb-6 transform-gpu p-8 rounded-full border border-[#00daf3]/20 bg-[#00daf3]/5 backdrop-blur-sm">
                <Cpu 
                  className="text-[#00daf3] animate-glow-pulse" 
                  size={64} 
                  strokeWidth={1} 
                />
              </div>

              <h2 className="text-[32px] font-extrabold tracking-[0.5em] text-[#00daf3] leading-none uppercase pl-[0.5em] font-manrope">
                HUB
              </h2>
            </div>
          </foreignObject>
        </g>

        {CATEGORIES.map((cat, index) => {
          const pos = getPosition(index);
          const isHovered = hoveredId === cat.id;
          
          return (
            <foreignObject 
                key={cat.id} 
                x={pos.x} 
                y={pos.y} 
                width="300" 
                height="180" 
                className="overflow-visible"
            >
              <motion.div 
                onMouseEnter={() => setHoveredId(cat.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                    "w-full h-full glass-card p-6 rounded-[24px] cursor-pointer flex flex-col justify-center group/card",
                    isHovered && "scale-105"
                )}
                style={isHovered ? { backgroundColor: 'rgba(0, 218, 243, 0.1)', border: '1px solid rgba(0, 218, 243, 0.3)' } : {}}
              >
                <div className="flex items-center gap-5">
                  <div 
                    className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-500",
                        isHovered ? "text-[#00daf3]" : "text-white/40"
                    )}
                  >
                    {/* @ts-ignore */}
                    {cat.icon && React.cloneElement(cat.icon as React.ReactElement, { size: 32, strokeWidth: 1.5 })}
                  </div>
                  
                  <div className="flex-grow">
                    <h3 className="text-white font-bold text-[24px] uppercase tracking-[0.05em] leading-tight font-manrope">
                        {cat.name}
                    </h3>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2 opacity-50 group-hover/card:opacity-100 transition-opacity">
                   {cat.systems.map((sys, i) => (
                      <span key={i} className="text-[14px] font-medium uppercase tracking-[0.05em] text-[#dae2fd] font-jakarta">
                         {sys}{i < cat.systems.length - 1 ? ' •' : ''}
                      </span>
                   ))}
                </div>
              </motion.div>
            </foreignObject>
          );
        })}
      </svg>
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}} />
    </div>
  );
}



