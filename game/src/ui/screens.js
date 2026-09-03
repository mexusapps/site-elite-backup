// ---------------------------------------------------------------------------
// screens.js — menus em DOM sobre o canvas.
//
// Por que DOM e não canvas: foco de teclado, leitores de tela, seleção de texto
// e escala de fonte saem de graça. Um menu desenhado no canvas é bonito e
// inacessível; aqui a acessibilidade é requisito, não enfeite.
// ---------------------------------------------------------------------------

import { ACTIONS, ACTION_LABELS, prettyKey } from '../core/input.js';
import { UPGRADES, RARITY } from '../game/upgrades.js';
import { TOTAL_WAVES } from '../game/balance.js';

const RAR_LABEL = { comum: 'comum', raro: 'raro', epico: 'épico' };

export class Screens {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.current = null;
    this.capture = null;
    this.build();
    this.bind();
  }

  build() {
    this.root.innerHTML = `
      <div class="screen" data-screen="title">
        <div class="titlewrap">
          <div class="logo" aria-hidden="true">
            <span class="l1">B</span><span class="l2">R</span><span class="l3">A</span><span class="l4">S</span><span class="l5">A</span>
          </div>
          <h1 class="sr">BRASA</h1>
          <p class="tag">Você é a última luz. Ela apaga sozinha.<br>Matar é como se acende de novo.</p>
          <nav class="menu">
            <button data-nav data-act="play" class="primary">Jogar</button>
            <button data-nav data-act="howto">Como jogar</button>
            <button data-nav data-act="options">Opções</button>
            <button data-nav data-act="stats">Marcas</button>
            <button data-nav data-act="credits">Sobre</button>
          </nav>
          <p class="hint" data-best></p>
        </div>
      </div>

      <div class="screen" data-screen="howto">
        <div class="panel wide">
          <h2>Como jogar</h2>
          <div class="cols">
            <section>
              <h3>O laço</h3>
              <p>Sua <b>chama</b> é a vida e a visão ao mesmo tempo — e ela apaga sozinha, sempre. Inimigos mortos soltam <b>fagulhas</b>, e fagulhas devolvem chama.</p>
              <p>Recuar é morrer devagar. O jogo empurra você para frente de propósito.</p>
            </section>
            <section>
              <h3>Comandos</h3>
              <ul class="keys" data-keys></ul>
            </section>
            <section>
              <h3>Regras que valem ouro</h3>
              <ul class="bullets">
                <li>O <b>golpe</b> é grátis. O <b>disparo</b> custa chama: use para o que não dá para chegar perto.</li>
                <li>O <b>avanço</b> tem invulnerabilidade. Atravessar o ataque é mais seguro que fugir dele.</li>
                <li><b>Carvão</b> bloqueia dano pela frente. Contorne.</li>
                <li><b>Véu</b> acelera o apagar enquanto estiver perto. Mate primeiro.</li>
                <li>Chefes sempre telegrafam. O anel fechando é o aviso.</li>
              </ul>
            </section>
          </div>
          <nav class="menu row">
            <button data-nav data-act="back" class="primary">Voltar</button>
          </nav>
        </div>
      </div>

      <div class="screen" data-screen="options">
        <div class="panel wide">
          <h2>Opções</h2>
          <div class="cols">
            <section>
              <h3>Som</h3>
              <label class="ctl"><span>Volume geral</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="master"><output data-out="master"></output></label>
              <label class="ctl"><span>Música</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="music"><output data-out="music"></output></label>
              <label class="ctl"><span>Efeitos</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="sfx"><output data-out="sfx"></output></label>

              <h3>Conforto</h3>
              <label class="ctl"><span>Tremor de tela</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="shake"><output data-out="shake"></output></label>
              <label class="ctl"><span>Clarões</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="flash"><output data-out="flash"></output></label>
              <label class="ctl"><span>Escuridão</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="darkness"><output data-out="darkness"></output></label>
              <p class="fine">Escuridão em 0 mantém a arena sempre visível. A chama continua sendo a vida.</p>
            </section>
            <section>
              <h3>Leitura</h3>
              <label class="ctl"><span>Paleta</span>
                <select data-nav data-set="palette">
                  <option value="padrao">Padrão</option>
                  <option value="daltonico">Daltonismo</option>
                  <option value="contraste">Alto contraste</option>
                </select>
              </label>
              <label class="ctl"><span>Tamanho do texto</span>
                <select data-nav data-set="textScale">
                  <option value="1">100%</option>
                  <option value="1.25">125%</option>
                  <option value="1.5">150%</option>
                  <option value="2">200%</option>
                </select>
              </label>
              <label class="ctl check"><input data-nav type="checkbox" data-set="showDamage"><span>Mostrar números de dano</span></label>
              <label class="ctl check"><input data-nav type="checkbox" data-set="assist"><span>Modo assistido</span></label>
              <p class="fine">Assistido: a chama apaga bem mais devagar, você recebe menos dano, as fagulhas valem mais e os chefes têm menos vida. Sem restrição nenhuma no resto do jogo.</p>
            </section>
            <section>
              <h3>Controles</h3>
              <p class="fine">Clique num campo e aperte a tecla (ou botão do mouse) que quiser.</p>
              <div class="binds" data-binds></div>
              <nav class="menu row tight">
                <button data-nav data-act="resetbinds">Restaurar controles</button>
              </nav>
            </section>
          </div>
          <nav class="menu row">
            <button data-nav data-act="back" class="primary">Voltar</button>
            <button data-nav data-act="wipe" class="danger">Apagar dados salvos</button>
          </nav>
        </div>
      </div>

      <div class="screen" data-screen="stats">
        <div class="panel">
          <h2>Marcas</h2>
          <dl class="stats" data-stats></dl>
          <nav class="menu row"><button data-nav data-act="back" class="primary">Voltar</button></nav>
        </div>
      </div>

      <div class="screen" data-screen="credits">
        <div class="panel">
          <h2>Sobre</h2>
          <p><b>BRASA</b> é um jogo de arena feito do zero: sem motor, sem biblioteca, sem nenhum arquivo de imagem ou de som.</p>
          <p>Tudo o que você vê é desenhado por código no canvas. Tudo o que você ouve é sintetizado ao vivo pelo WebAudio — os efeitos têm três camadas por evento e variação de afinação a cada disparo, e a trilha é adaptativa: as camadas entram conforme a intensidade da onda.</p>
          <p>A jogabilidade segue as três camadas do <i>game feel</i>: controle em tempo real (buffer de comando de 130 ms, invulnerabilidade no avanço), espaço simulado (passo fixo de 60 Hz, separação de corpos, câmera com zona morta e antecipação) e só então polimento (congelamento de 40–110 ms no impacto, tremor direcional, esmagamento e estiramento, partículas).</p>
          <p class="fine">Feito com Claude Code. O código-fonte, o sistema de compilação e o harness de playtest automatizado acompanham o projeto.</p>
          <nav class="menu row"><button data-nav data-act="back" class="primary">Voltar</button></nav>
        </div>
      </div>

      <div class="screen" data-screen="pause">
        <div class="panel">
          <h2>Pausado</h2>
          <p class="fine" data-pauseinfo></p>
          <nav class="menu">
            <button data-nav data-act="resume" class="primary">Continuar</button>
            <button data-nav data-act="options">Opções</button>
            <button data-nav data-act="quit" class="danger">Abandonar a run</button>
          </nav>
        </div>
      </div>

      <div class="screen" data-screen="upgrade">
        <div class="panel wide">
          <h2>Sopro</h2>
          <p class="fine">A onda passou. Escolha uma bênção — teclas <b>1</b>, <b>2</b>, <b>3</b>.</p>
          <div class="cards" data-cards></div>
        </div>
      </div>

      <div class="screen" data-screen="gameover">
        <div class="panel">
          <h2 class="dead">A chama apagou</h2>
          <dl class="stats" data-run></dl>
          <nav class="menu row">
            <button data-nav data-act="retry" class="primary">De novo</button>
            <button data-nav data-act="menu">Menu</button>
          </nav>
        </div>
      </div>

      <div class="screen" data-screen="victory">
        <div class="panel">
          <h2 class="win">A noite recuou</h2>
          <p>Quinze ondas. Dois guardiões. A brasa continua acesa.</p>
          <dl class="stats" data-run></dl>
          <nav class="menu row">
            <button data-nav data-act="retry" class="primary">Jogar de novo</button>
            <button data-nav data-act="menu">Menu</button>
          </nav>
        </div>
      </div>
    `;
  }

  bind() {
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (b) { this.game.uiAction(b.dataset.act, b.dataset.arg); return; }
      const card = e.target.closest('[data-card]');
      if (card) { this.game.uiAction('pick', card.dataset.card); return; }
      const slot = e.target.closest('[data-bind]');
      if (slot) this.startCapture(slot);
    });

    this.root.addEventListener('input', (e) => {
      const el = e.target.closest('[data-set]');
      if (!el) return;
      const key = el.dataset.set;
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'range') v = parseFloat(el.value);
      else if (key === 'textScale') v = parseFloat(el.value);
      else v = el.value;
      this.game.setSetting(key, v);
      this.syncOutputs();
    });

    // navegação por teclado dentro do menu ativo
    this.root.addEventListener('keydown', (e) => {
      if (this.capture) return;
      const items = this.navItems();
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (document.activeElement && document.activeElement.type === 'range') return;
        e.preventDefault();
        const n = items.length;
        const next = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        items[next].focus();
      }
    });
  }

  navItems() {
    if (!this.current) return [];
    const scr = this.root.querySelector(`[data-screen="${this.current}"]`);
    if (!scr) return [];
    return Array.from(scr.querySelectorAll('[data-nav]:not([disabled])'))
      .filter((el) => el.offsetParent !== null);
  }

  startCapture(slot) {
    if (this.capture) this.capture.classList.remove('capturing');
    this.capture = slot;
    slot.classList.add('capturing');
    slot.textContent = 'aperte…';
    this.game.captureBind(slot.dataset.bind, parseInt(slot.dataset.slot, 10), () => {
      this.capture = null;
      this.renderBinds();
    });
  }

  show(name) {
    this.current = name;
    this.root.hidden = !name;
    this.root.classList.toggle('active', !!name);
    for (const s of this.root.querySelectorAll('.screen')) {
      s.classList.toggle('on', s.dataset.screen === name);
    }
    if (name === 'options') { this.syncOutputs(); this.renderBinds(); }
    if (name === 'howto') this.renderKeys();
    if (name === 'stats') this.renderStats();
    if (name === 'title') this.renderBest();
    // foca o primeiro item para o teclado funcionar sem clique
    requestAnimationFrame(() => {
      const items = this.navItems();
      if (items.length) items[0].focus({ preventScroll: true });
    });
  }

  syncOutputs() {
    const s = this.game.settings;
    for (const el of this.root.querySelectorAll('[data-set]')) {
      const k = el.dataset.set;
      if (el.type === 'checkbox') el.checked = !!s[k];
      else if (el.type === 'range') el.value = s[k];
      else el.value = String(s[k]);
    }
    for (const o of this.root.querySelectorAll('[data-out]')) {
      const k = o.dataset.out;
      o.textContent = Math.round((s[k] || 0) * 100) + '%';
    }
  }

  renderBinds() {
    const host = this.root.querySelector('[data-binds]');
    if (!host) return;
    const binds = this.game.input.binds;
    host.innerHTML = ACTIONS.map((a) => `
      <div class="bindrow">
        <span class="bindname">${ACTION_LABELS[a]}</span>
        <button class="bindslot" data-nav data-bind="${a}" data-slot="0">${prettyKey((binds[a] || [])[0])}</button>
        <button class="bindslot" data-nav data-bind="${a}" data-slot="1">${prettyKey((binds[a] || [])[1])}</button>
      </div>`).join('');
  }

  renderKeys() {
    const host = this.root.querySelector('[data-keys]');
    if (!host) return;
    const b = this.game.input.binds;
    const row = (label, a) => `<li><span>${label}</span><kbd>${prettyKey((b[a] || [])[0])}</kbd><kbd>${prettyKey((b[a] || [])[1])}</kbd></li>`;
    host.innerHTML =
      `<li><span>Mover</span><kbd>${prettyKey(b.up[0])}${prettyKey(b.left[0])}${prettyKey(b.down[0])}${prettyKey(b.right[0])}</kbd><kbd>setas</kbd></li>` +
      row('Golpe', 'attack') + row('Disparo', 'shoot') + row('Avanço', 'dash') + row('Pausa', 'pause') +
      `<li><span>Mirar</span><kbd>mouse</kbd><kbd>direção</kbd></li>` +
      `<li><span>Controle</span><kbd colspan>gamepad suportado</kbd></li>`;
  }

  renderBest() {
    const el = this.root.querySelector('[data-best]');
    if (!el) return;
    const st = this.game.save.stats;
    if (!st.runs) { el.textContent = 'Nenhuma tentativa ainda.'; return; }
    const parts = [`${st.runs} ${st.runs === 1 ? 'tentativa' : 'tentativas'}`];
    if (st.bestWave) parts.push(`melhor: onda ${st.bestWave}`);
    if (st.wins) parts.push(`${st.wins} ${st.wins === 1 ? 'vitória' : 'vitórias'}`);
    el.textContent = parts.join(' · ');
  }

  renderStats() {
    const host = this.root.querySelector('[data-stats]');
    if (!host) return;
    const s = this.game.save.stats;
    const fmt = (v) => (v || 0).toLocaleString('pt-BR');
    const rows = [
      ['Tentativas', fmt(s.runs)],
      ['Vitórias', fmt(s.wins)],
      ['Melhor onda', s.bestWave ? `${s.bestWave} / ${TOTAL_WAVES}` : '—'],
      ['Melhor pontuação', fmt(s.bestScore || 0)],
      ['Inimigos apagados', fmt(s.kills)],
      ['Fagulhas recolhidas', fmt(s.embers)],
      ['Melhor tempo até a vitória', s.bestTime ? this.time(s.bestTime) : '—'],
    ];
    host.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  time(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  renderRun(screen, w, save) {
    const host = this.root.querySelector(`[data-screen="${screen}"] [data-run]`);
    if (!host) return;
    const acc = w.stats.shots ? Math.round((w.stats.hits / Math.max(1, w.stats.shots + w.stats.kills)) * 100) : 0;
    const rows = [
      ['Pontuação', w.score.toLocaleString('pt-BR')],
      ['Onda alcançada', `${w.wave} / ${TOTAL_WAVES}`],
      ['Inimigos apagados', String(w.stats.kills)],
      ['Tempo', this.time(w.time)],
      ['Chama restante', `${Math.max(0, Math.ceil(w.player.flame))}`],
      ['Sopros recebidos', String(Object.values(w.taken).reduce((a, b) => a + b, 0))],
    ];
    const best = save.stats.bestScore || 0;
    host.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
      (w.score >= best && w.score > 0 ? `<div class="record"><dt>Recorde</dt><dd>novo!</dd></div>` : '');
  }

  renderUpgrades(offers, taken) {
    const host = this.root.querySelector('[data-cards]');
    if (!host) return;
    host.innerHTML = offers.map((u, i) => {
      const n = taken[u.id] || 0;
      return `
      <button class="card ${u.rarity}" data-nav data-card="${i}">
        <span class="num">${i + 1}</span>
        <span class="rar">${RAR_LABEL[u.rarity]}</span>
        <strong>${u.name}</strong>
        <span class="desc">${u.desc}</span>
        ${n ? `<span class="stack">já tem ${n}</span>` : ''}
      </button>`;
    }).join('');
  }
}
