
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Blinds, 
  Thermometer, 
  ShieldAlert, 
  Music, 
  Zap, 
  ChevronRight,
  Power,
  Umbrella,
  Wind,
  Droplets,
  Activity,
  User,
  Bell,
  Search,
  Plus,
  Play,
  Volume2,
  Lock,
  Unlock,
  Fan,
  Sun,
  Moon,
  Home,
  Shield
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = 'All' | 'Lighting' | 'Climate' | 'Security' | 'Media' | 'Sensors';

interface DeviceState {
  id: string;
  name: string;
  category: Category;
  isOn: boolean;
  value: number;
  unit?: string;
  statusText?: string;
  icon: React.ReactNode;
}

const INITIAL_DEVICES: DeviceState[] = [
  { id: 'l1', name: 'Sala de Estar', category: 'Lighting', isOn: true, value: 75, unit: '%', icon: <Lightbulb /> },
  { id: 'l2', name: 'Suíte Master', category: 'Lighting', isOn: false, value: 0, unit: '%', icon: <Lightbulb /> },
  { id: 'c1', name: 'Ar Condicionado', category: 'Climate', isOn: true, value: 22, unit: '°C', icon: <Wind /> },
  { id: 'c2', name: 'Piso Aquecido', category: 'Climate', isOn: false, value: 18, unit: '°C', icon: <Thermometer /> },
  { id: 'b1', name: 'Persiana Varanda', category: 'Lighting', isOn: true, value: 100, unit: '%', icon: <Blinds /> },
  { id: 'b2', name: 'Cortina Cinema', category: 'Lighting', isOn: false, value: 0, unit: '%', icon: <Blinds /> },
  { id: 's1', name: 'Alarme Perimetral', category: 'Security', isOn: true, value: 0, statusText: 'Armado', icon: <ShieldAlert /> },
  { id: 'm1', name: 'Som Ambiente', category: 'Media', isOn: true, value: 45, unit: '%', icon: <Music /> },
  { id: 'sn1', name: 'Sensor CO2', category: 'Sensors', isOn: true, value: 420, unit: 'ppm', statusText: 'Excelente', icon: <Activity /> },
  { id: 'sn2', name: 'Umidade Relativa', category: 'Sensors', isOn: true, value: 55, unit: '%', icon: <Droplets /> },
  { id: 'sn3', name: 'Sensor Presença', category: 'Sensors', isOn: true, value: 1, statusText: 'Ativo', icon: <User /> },
  { id: 'n1', name: 'Controladora Elite', category: 'Sensors', isOn: true, value: 0, statusText: 'v3.5 Optimal', icon: <Activity /> },
  { id: 's2', name: 'Câmera Varanda', category: 'Security', isOn: true, value: 0, statusText: 'Live Feed', icon: <Shield /> },
  { id: 'i1', name: 'Irrigação Jardim', category: 'Climate', isOn: false, value: 0, statusText: 'Standby', icon: <Droplets /> },
];

const SCENES = [
  { id: 'sc1', name: 'Modo Cinema', icon: <Play />, color: 'from-blue-600 to-indigo-800' },
  { id: 'sc2', name: 'Sair de Casa', icon: <Power />, color: 'from-red-600 to-orange-800' },
  { id: 'sc3', name: 'Modo Relax', icon: <Moon />, color: 'from-purple-600 to-pink-800' },
  { id: 'sc4', name: 'Bom Dia', icon: <Sun />, color: 'from-amber-400 to-orange-600' },
];

const AutomationTeste2: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [devices, setDevices] = useState<DeviceState[]>(INITIAL_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleDevice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDevices(prev => prev.map(d => d.id === id ? { ...d, isOn: !d.isOn } : d));
  };

  const updateDeviceValue = (id: string, newValue: number) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, value: newValue } : d));
  };

  const filteredDevices = activeCategory === 'All' 
    ? devices 
    : devices.filter(d => d.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-gold-500/30 overflow-hidden flex justify-center">
      <div className="w-full max-w-[500px] h-screen bg-[#0a0a0a] relative shadow-2xl overflow-y-auto no-scrollbar border-x border-white/5">
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-gold-500/10 to-transparent pointer-events-none" />
        
        <header className="sticky top-0 z-50 p-6 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="flex flex-col">
            <h1 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mb-1">Elite Hub</h1>
            <p className="text-lg font-bold flex items-center gap-2">
              Olá, Elite User <span className="animate-pulse">✨</span>
            </p>
          </div>
          <div className="flex gap-3">
             <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Search className="w-5 h-5 text-white/70" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 relative">
              <Bell className="w-5 h-5 text-white/70" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-gold-500 rounded-full border border-black shadow-lg" />
            </button>
          </div>
        </header>

        <section className="px-6 mb-8 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Cenas Master</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {SCENES.map((scene) => (
              <motion.button
                key={scene.id}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "min-w-[140px] p-4 rounded-2xl bg-gradient-to-br flex flex-col gap-3 items-start border border-white/5",
                  scene.color
                )}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                   {/* @ts-ignore */}
                  {scene.icon && React.cloneElement(scene.icon as React.ReactElement, { size: 20 })}
                </div>
                <span className="font-bold text-sm tracking-tight">{scene.name}</span>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="px-6 mb-8">
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gold-500 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                <Power className="text-black w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Ecosistema</p>
                <p className="text-sm font-bold text-gold-400">Todo o sistema ONLINE</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold italic tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 mb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(['All', 'Climate', 'Lighting', 'Security', 'Media', 'Sensors'] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                   "px-5 py-2.5 rounded-full text-xs font-bold transition-all border uppercase tracking-widest whitespace-nowrap",
                   activeCategory === cat 
                     ? "bg-gold-500 text-black border-gold-500" 
                     : "bg-transparent text-white/50 border-white/10"
                 )}
              >
                {cat === 'All' ? 'Início' : cat}
              </button>
            ))}
          </div>
        </section>

        <section className="px-6 pb-32">
          <AnimatePresence mode='popLayout'>
            <motion.div layout className="grid grid-cols-2 gap-4">
              {filteredDevices.map((device) => (
                <motion.div
                  key={device.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedDevice(device)}
                  className={cn(
                    "p-5 rounded-[2.5rem] bg-white/5 border border-white/10 transition-all cursor-pointer relative overflow-hidden group",
                    device.isOn && "bg-white/10 border-white/20 shadow-xl"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      device.isOn ? "bg-gold-500 text-black shadow-lg" : "bg-white/10 text-white/50"
                    )}>
                       {/* @ts-ignore */}
                      {device.icon && React.cloneElement(device.icon as React.ReactElement, { size: 24 })}
                    </div>
                    <button 
                      onClick={(e) => toggleDevice(device.id, e)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                        device.isOn ? "bg-gold-500/20 border-gold-500/50 text-gold-400" : "bg-black/50 border-white/10 text-white/30"
                      )}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight mb-1">{device.name}</h3>
                    <p className={cn(
                      "text-xs font-medium uppercase tracking-widest",
                      device.isOn ? "text-gold-400" : "text-white/30"
                    )}>
                      {device.isOn ? (device.value > 0 ? `${device.value}${device.unit || ''}` : 'Ativo') : 'OFFLINE'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </section>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[450px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 flex justify-between items-center z-[100] shadow-2xl">
          <button className="flex flex-col items-center gap-1 text-gold-500 px-4">
            <Home className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Início</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/30 px-4">
            <Activity className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Status</span>
          </button>
          <div className="w-14 h-14 bg-gradient-to-br from-gold-400 to-amber-700 rounded-2xl -mt-10 border-4 border-[#0a0a0a] flex items-center justify-center shadow-lg">
            <Zap className="w-8 h-8 text-black fill-current" />
          </div>
          <button className="flex flex-col items-center gap-1 text-white/30 px-4">
            <Umbrella className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Cenas</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white/30 px-4">
            <User className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Perfil</span>
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {selectedDevice && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-3xl flex items-center justify-center"
          >
            <div className="text-center p-12">
              <h2 className="text-3xl font-black mb-8">{selectedDevice.name}</h2>
              <p className="text-gold-500 mb-12 uppercase tracking-widest text-sm">Controle em Desenvolvimento</p>
              <button 
                onClick={() => setSelectedDevice(null)}
                className="px-12 py-5 bg-gold-500 text-black rounded-3xl font-bold uppercase tracking-widest"
              >
                Voltar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default AutomationTeste2;



