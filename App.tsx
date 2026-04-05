
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ServicosEliteOficial from './pages/ServicosEliteOficial';
import Contact from './pages/Contact';
import Quote from './pages/Quote';
import Partners from './pages/Partners';
import DetailedQuote from './pages/DetailedQuote';
import AutomationImersivo from './pages/AutomationImersivo';
import AutomationMobile from './pages/AutomationMobile';
import Downloads from './pages/Downloads';
import HomeProposal from './pages/HomeProposal';
import HomeOriginal from './pages/HomeOriginal';

// Handle scroll to top and smooth scroll to anchors
const ScrollHandler = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // Offset for the sticky menu
        const offset = 160; 
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } else {
        // Retry for dynamic content
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            const offset = 160;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
          }
        }, 300);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname, hash]);

  return null;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ScrollHandler />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<ServicosEliteOficial />} />
          <Route path="partners" element={<Partners />} />
          <Route path="contact" element={<Contact />} />
          <Route path="quote" element={<Quote />} />
          <Route path="detailed-quote" element={<DetailedQuote />} />
          <Route path="downloads" element={<Downloads />} />
          <Route path="proposta-home" element={<HomeProposal />} />
          <Route path="conferir-original" element={<HomeOriginal />} />
        </Route>
        <Route path="teste" element={<AutomationImersivo />} />
        <Route path="teste2" element={<AutomationMobile />} />
      </Routes>
    </HashRouter>
  );
};

export default App;

// Refresh: 1775053264545


