
import React from 'react';
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
  Power,
  Sun,
  Palette,
  Volume2,
  Tv,
  DoorOpen,
  Wifi,
  Eye,
  Thermometer,
  Waves
} from 'lucide-react';

export type CategoryId = 'lighting' | 'climate' | 'blinds' | 'access' | 'scenes' | 'media' | 'scheduling' | 'security';

export interface DetailItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface CategoryDetail {
  id: CategoryId;
  title: string;
  subtitle: string;
  description: string;
  items: DetailItem[];
}

export const CATEGORY_DETAILS: Record<CategoryId, CategoryDetail> = {
  climate: {
    id: 'climate',
    title: 'Climatização Inteligente',
    subtitle: 'Temperatura Ideal em Cada Zona',
    description: 'Controle o clima da sua residência de forma eficiente e setorizada.',
    items: [
      { 
        title: 'Ar Condicionado', 
        description: 'Ajuste a temperatura e ventilação de todas as unidades split ou centrais remotamente.', 
        icon: <Wind /> 
      },
      { 
        title: 'Piso Térmico', 
        description: 'Controle de aquecimento de piso por zonas, ideal para manter o conforto nos meses de inverno.', 
        icon: <Thermometer /> 
      },
      { 
        title: 'Sensores de Clima', 
        description: 'O sistema gerencia as cortinas e o AC para manter a temperatura estável sem desperdício de energia.', 
        icon: <Thermometer /> 
      }
    ]
  },
  lighting: {
    id: 'lighting',
    title: 'Iluminação Inteligente',
    subtitle: 'Conforto e Eficiência Luminosa',
    description: 'Transforme o ambiente da sua casa com sistemas de iluminação que se adaptam ao seu estilo de vida.',
    items: [
      { 
        title: 'Controle ON/OFF', 
        description: 'Ligue e desligue todos os circuitos de iluminação de forma remota pelo aplicativo, de qualquer lugar do mundo.', 
        icon: <Power /> 
      },
      { 
        title: 'Dimmer (Dimerização)', 
        description: 'Ajuste a intensidade das lâmpadas para criar o clima perfeito para cada ocasião, com economia de energia.', 
        icon: <Sun /> 
      },
      { 
        title: 'Sistemas RGB', 
        description: 'Explore milhões de cores e crie efeitos decorativos únicos para festas, relaxamento ou design de interiores.', 
        icon: <Palette /> 
      },
      { 
        title: 'Cenários de Luz', 
        description: 'Programe múltiplos circuitos para agirem juntos com um único comando (ex: Cena Jantar, Cinema, Bom Dia).', 
        icon: <Play /> 
      }
    ]
  },
  media: {
    id: 'media',
    title: 'Som & Vídeo de Alta Fidelidade',
    subtitle: 'Experiência de Cinema e Lazer',
    description: 'Centralize seu entretenimento com áudio multiroom e salas de cinema de última geração.',
    items: [
      { 
        title: 'Som Ambiente (Multiroom)', 
        description: 'Ouça músicas diferentes em cada cômodo ou sincronize a casa inteira via Spotify, AirPlay ou Bluetooth.', 
        icon: <Volume2 /> 
      },
      { 
        title: 'Sala de Cinema (Home Theater)', 
        description: 'Sistemas 7.1.4 Dolby Atmos com caixas embutidas e projetores 4K para uma imersão total em filmes e jogos.', 
        icon: <Tv /> 
      },
      { 
        title: 'Media Center Integrado', 
        description: 'Controle sua Apple TV, Nvidia Shield e consoles em uma única interface, eliminando múltiplos controles remotos.', 
        icon: <Play /> 
      }
    ]
  },
  blinds: {
    id: 'blinds',
    title: 'Persianas & Cortinas Motorizadas',
    subtitle: 'Privacidade e Gestão de Luz Natural',
    description: 'Automatize suas janelas para conforto térmico e proteção solar inteligente.',
    items: [
      { 
        title: 'Cortinas & Persianas', 
        description: 'Abertura e fechamento sincronizados por horário, luminosidade ou comando de voz via Alexa/Google.', 
        icon: <Blinds /> 
      },
      { 
        title: 'Motores de Portão', 
        description: 'Gestão de garagem e portões sociais com status de abertura e fechamento em tempo real no seu smartphone.', 
        icon: <DoorOpen /> 
      },
      { 
        title: 'Toldos & Coberturas', 
        description: 'Proteção solar que se recolhe sozinha em caso de ventos fortes, preservando o equipamento.', 
        icon: <Sun /> 
      }
    ]
  },
  security: {
    id: 'security',
    title: 'Segurança & Monitoramento 24h',
    subtitle: 'Proteção Total da sua Família',
    description: 'Sistemas avançados de vigilância e alarme integrados à sua automação.',
    items: [
      { 
        title: 'Monitoramento CFTV', 
        description: 'Acesso às câmeras 4K com inteligência artificial para detecção de pessoas e veículos nas áreas externas.', 
        icon: <Eye /> 
      },
      { 
        title: 'Alarme Monitorado', 
        description: 'Arme e desarme seu sistema de alarme à distância e receba notificações imediatas em caso de invasão.', 
        icon: <Shield /> 
      },
      { 
        title: 'Pânico & Emergência', 
        description: 'Botões de pânico silenciosos que alertam a central de segurança e acendem todas as luzes da casa.', 
        icon: <Activity /> 
      }
    ]
  },
  access: {
    id: 'access',
    title: 'Controle de Acessos',
    subtitle: 'Entrada Inteligente e Segura',
    description: 'Gerencie quem entra na sua casa com tecnologia biométrica e digital.',
    items: [
      { 
        title: 'Biometria & Reconhecimento', 
        description: 'Acesso por impressão digital ou reconhecimento facial, eliminando a necessidade de chaves físicas.', 
        icon: <Lock /> 
      },
      { 
        title: 'Fechaduras Digitais', 
        description: 'Crie senhas temporárias para prestadores de serviço e monitore quem e quando entrou na residência.', 
        icon: <Lock /> 
      },
      { 
        title: 'Vídeo Porteiro', 
        description: 'Atenda o interfone pelo celular, fale com o visitante e abra o portão de qualquer lugar.', 
        icon: <DoorOpen /> 
      }
    ]
  },
  scheduling: {
    id: 'scheduling',
    title: 'Agendamentos Inteligentes',
    subtitle: 'Automação por Horários e Eventos',
    description: 'Programe sua casa para agir sozinha em horários específicos, garantindo conforto e economia sem esforço.',
    items: [
      { 
        title: 'Rotinas de Iluminação', 
        description: 'Programe horários fixos para ligar e desligar luzes internas e externas, criando rotinas automáticas de conforto.', 
        icon: <Power /> 
      },
      { 
        title: 'Gestão de Persianas', 
        description: 'Agende a abertura automática ao despertar e o fechamento total ao anoitecer para máxima privacidade.', 
        icon: <Blinds /> 
      },
      { 
        title: 'Relógio Astronômico', 
        description: 'Sincronize sua casa com o nascer e pôr do sol local para ajustes automáticos baseados na luz natural.', 
        icon: <Sun /> 
      }
    ]
  },
  scenes: {
    id: 'scenes',
    title: 'Cenários Customizados',
    subtitle: 'Orchestração do seu Estilo de Vida',
    description: 'Múltiplas ações coordenadas com um único toque.',
    items: [
      { 
        title: 'Cena Cinema', 
        description: 'Luzes apagam, cortinas fecham, projetor liga e o som ajusta o volume automaticamente.', 
        icon: <Play /> 
      },
      { 
        title: 'Cena Sair (All Off)', 
        description: 'Um toque ao sair de casa desliga todas as luzes, ACs, TVs e arma o alarme principal.', 
        icon: <Power /> 
      },
      { 
        title: 'Cena Festa', 
        description: 'Iluminação RGB animada, som ambiente em volume ideal e fontes de água ativadas.', 
        icon: <Music /> 
      }
    ]
  }
};



