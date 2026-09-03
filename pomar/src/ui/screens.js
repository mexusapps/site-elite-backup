// ---------------------------------------------------------------------------
// screens.js — menus em DOM. Foco de teclado, leitor de tela e escala de fonte
// vêm de graça; num jogo para criança isso não é opcional.
// ---------------------------------------------------------------------------

import { FRUTAS, MAX_TIER } from '../game/fruits.js';
import { desenharFruta } from '../render/draw.js';

export class Telas {
  constructor(root, jogo) {
    this.root = root;
    this.app = jogo;
    this.atual = null;
    this.montar();
    this.ligar();
  }

  montar() {
    this.root.innerHTML = `
      <div class="tela" data-tela="titulo">
        <div class="capa">
          <div class="logo"><span>P</span><span>O</span><span>M</span><span>A</span><span>R</span></div>
          <p class="lema">Junte duas frutas iguais e elas viram uma maior.<br>Sem pressa, sem perder — dá para brincar o dia inteiro.</p>
          <nav class="menu">
            <button data-nav data-act="jogar" class="grande">Jogar</button>
            <button data-nav data-act="tranquilo">Modo tranquilo</button>
            <button data-nav data-act="comojoga">Como joga</button>
            <button data-nav data-act="album">Álbum de frutas</button>
            <button data-nav data-act="opcoes">Opções</button>
            <button data-nav data-act="marcas">Minhas marcas</button>
          </nav>
          <p class="rodape" data-recorde></p>
        </div>
      </div>

      <div class="tela" data-tela="comojoga">
        <div class="painel largo">
          <h2>Como joga</h2>
          <div class="colunas">
            <section>
              <h3>1. Solte a fruta</h3>
              <p>Mexa o dedo ou o mouse para escolher o lugar e solte. Pelo teclado: <kbd>←</kbd> <kbd>→</kbd> para mover e <kbd>espaço</kbd> para soltar.</p>
              <h3>2. Junte as iguais</h3>
              <p>Duas frutas <b>iguais</b> que se encostam viram <b>uma maior</b> — e tocam uma nota mais aguda. Encadeie várias e vira música.</p>
              <h3>3. Chegue na melancia</h3>
              <p>Esta é a ordem. Duas melancias viram <b>bolo de festa</b>!</p>
              <div class="cadeia" data-cadeia></div>
            </section>
            <section>
              <h3>Ninguém perde</h3>
              <p>Se a cesta encher demais, o <b>tucano</b> vem e leva as frutinhas pequenas para o lanche dele. Você <b>nunca</b> perde pontos e o jogo <b>nunca</b> acaba.</p>
              <h3>Ajudas</h3>
              <p><b>Chacoalhar</b> sacode a cesta para as frutas se acomodarem — enche sozinho com o tempo (<kbd>C</kbd>).</p>
              <p><b>Regador</b> faz uma fruta da cesta crescer um degrau. Você ganha um a cada dois pedidos (<kbd>R</kbd>).</p>
              <h3>Pedidos</h3>
              <p>O bichinho do canto pede uma fruta. Faça essa fruta e ele fica feliz — e você ganha pontos extras.</p>
            </section>
          </div>
          <nav class="menu linha"><button data-nav data-act="voltar" class="grande">Entendi</button></nav>
        </div>
      </div>

      <div class="tela" data-tela="album">
        <div class="painel largo">
          <h2>Álbum de frutas</h2>
          <p class="fino">Cada fruta que você faz uma vez fica guardada aqui para sempre.</p>
          <div class="album" data-album></div>
          <nav class="menu linha"><button data-nav data-act="voltar" class="grande">Voltar</button></nav>
        </div>
      </div>

      <div class="tela" data-tela="opcoes">
        <div class="painel largo">
          <h2>Opções</h2>
          <div class="colunas">
            <section>
              <h3>Som</h3>
              <label class="ctl"><span>Volume</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="master"><output data-out="master"></output></label>
              <label class="ctl"><span>Música</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="musica"><output data-out="musica"></output></label>
              <label class="ctl"><span>Efeitos</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="efeitos"><output data-out="efeitos"></output></label>
              <h3>Conforto</h3>
              <label class="ctl"><span>Tremidinha</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="tremor"><output data-out="tremor"></output></label>
              <label class="ctl"><span>Brilhos</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="brilhos"><output data-out="brilhos"></output></label>
            </section>
            <section>
              <h3>Leitura</h3>
              <label class="ctl"><span>Cores</span>
                <select data-nav data-set="paleta">
                  <option value="pomar">Pomar</option>
                  <option value="suave">Suave</option>
                  <option value="forte">Alto contraste</option>
                </select>
              </label>
              <label class="ctl"><span>Tamanho do texto</span>
                <select data-nav data-set="tamanhoTexto">
                  <option value="1">100%</option>
                  <option value="1.25">125%</option>
                  <option value="1.5">150%</option>
                  <option value="2">200%</option>
                </select>
              </label>
              <label class="ctl marca"><input data-nav type="checkbox" data-set="numeros"><span>Mostrar o número do degrau na fruta</span></label>
              <label class="ctl marca"><input data-nav type="checkbox" data-set="nomes"><span>Mostrar o nome da fruta</span></label>
              <p class="fino">O número no meio da fruta ajuda quem não distingue bem as cores: frutas iguais têm sempre o mesmo número.</p>
            </section>
          </div>
          <nav class="menu linha">
            <button data-nav data-act="voltar" class="grande">Voltar</button>
            <button data-nav data-act="apagar" class="perigo">Apagar meus dados</button>
          </nav>
        </div>
      </div>

      <div class="tela" data-tela="marcas">
        <div class="painel">
          <h2>Minhas marcas</h2>
          <dl class="marcas" data-marcas></dl>
          <nav class="menu linha"><button data-nav data-act="voltar" class="grande">Voltar</button></nav>
        </div>
      </div>

      <div class="tela" data-tela="pausa">
        <div class="painel">
          <h2>Pausa</h2>
          <p class="fino" data-pausainfo></p>
          <nav class="menu">
            <button data-nav data-act="continuar" class="grande">Continuar</button>
            <button data-nav data-act="album">Álbum</button>
            <button data-nav data-act="opcoes">Opções</button>
            <button data-nav data-act="terminar">Terminar e ver o resultado</button>
          </nav>
        </div>
      </div>

      <div class="tela" data-tela="resultado">
        <div class="painel">
          <h2>Que colheita!</h2>
          <dl class="marcas" data-resultado></dl>
          <nav class="menu linha">
            <button data-nav data-act="jogar" class="grande">Jogar de novo</button>
            <button data-nav data-act="menu">Menu</button>
          </nav>
        </div>
      </div>
    `;
  }

  ligar() {
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (b) this.app.acao(b.dataset.act);
    });
    this.root.addEventListener('input', (e) => {
      const el = e.target.closest('[data-set]');
      if (!el) return;
      const k = el.dataset.set;
      let v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'range') v = parseFloat(el.value);
      else if (k === 'tamanhoTexto') v = parseFloat(el.value);
      else v = el.value;
      this.app.definirOpcao(k, v);
      this.sincronizar();
    });
    this.root.addEventListener('keydown', (e) => {
      const itens = this.itens();
      if (!itens.length) return;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement
        && document.activeElement.type !== 'range') {
        e.preventDefault();
        const i = itens.indexOf(document.activeElement);
        const n = itens.length;
        itens[i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n].focus();
      }
    });
  }

  itens() {
    if (!this.atual) return [];
    const t = this.root.querySelector(`[data-tela="${this.atual}"]`);
    if (!t) return [];
    return Array.from(t.querySelectorAll('[data-nav]:not([disabled])')).filter((el) => el.offsetParent !== null);
  }

  mostrar(nome) {
    this.atual = nome;
    this.root.hidden = !nome;
    this.root.classList.toggle('ativo', !!nome);
    for (const t of this.root.querySelectorAll('.tela')) {
      t.classList.toggle('on', t.dataset.tela === nome);
    }
    if (nome === 'opcoes') this.sincronizar();
    if (nome === 'album') this.renderAlbum();
    if (nome === 'comojoga') this.renderCadeia();
    if (nome === 'marcas') this.renderMarcas();
    if (nome === 'titulo') this.renderRecorde();
    requestAnimationFrame(() => {
      const it = this.itens();
      if (it.length) it[0].focus({ preventScroll: true });
    });
  }

  sincronizar() {
    const o = this.app.opcoes;
    for (const el of this.root.querySelectorAll('[data-set]')) {
      const k = el.dataset.set;
      if (el.type === 'checkbox') el.checked = !!o[k];
      else if (el.type === 'range') el.value = o[k];
      else el.value = String(o[k]);
    }
    for (const out of this.root.querySelectorAll('[data-out]')) {
      out.textContent = Math.round((o[out.dataset.out] || 0) * 100) + '%';
    }
  }

  renderRecorde() {
    const el = this.root.querySelector('[data-recorde]');
    if (!el) return;
    const m = this.app.dados.marcas;
    if (!m.partidas) { el.textContent = 'Primeira vez por aqui? Aperte Jogar.'; return; }
    const partes = [`${m.partidas} ${m.partidas === 1 ? 'colheita' : 'colheitas'}`];
    if (m.melhorPontos) partes.push(`recorde ${m.melhorPontos.toLocaleString('pt-BR')}`);
    if (m.melhorFruta >= 0) partes.push(`maior fruta: ${FRUTAS[m.melhorFruta].nome}`);
    el.textContent = partes.join(' · ');
  }

  /** O álbum desenha as frutas de verdade, com os mesmos sprites do jogo. */
  renderAlbum() {
    const host = this.root.querySelector('[data-album]');
    if (!host) return;
    const vistos = new Set(this.app.dados.album);
    host.innerHTML = '';
    for (const f of FRUTAS) {
      const item = document.createElement('div');
      item.className = 'fruta' + (vistos.has(f.id) ? '' : ' oculta');
      const cv = document.createElement('canvas');
      const S = 84;
      cv.width = cv.height = S * 2;
      cv.style.width = cv.style.height = S + 'px';
      const g = cv.getContext('2d');
      g.scale(2, 2);
      if (vistos.has(f.id)) {
        desenharFruta(g, f.id, S / 2, S / 2, Math.min(34, f.r * 0.55), 0, 1, 1, 0.4, { face: f.id * 7, feliz: 0.5 });
      } else {
        g.fillStyle = 'rgba(120,90,60,0.22)';
        g.beginPath(); g.arc(S / 2, S / 2, Math.min(34, f.r * 0.55), 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(120,90,60,0.5)';
        g.font = "800 26px 'Baloo 2', system-ui, sans-serif";
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('?', S / 2, S / 2 + 1);
      }
      const nome = document.createElement('span');
      nome.textContent = vistos.has(f.id) ? f.nome : '???';
      item.appendChild(cv);
      item.appendChild(nome);
      host.appendChild(item);
    }
  }

  /**
   * A corrente das frutas desenhada de verdade. Para uma criança que ainda não
   * lê, esta fileira explica o jogo inteiro melhor do que qualquer frase.
   */
  renderCadeia() {
    const host = this.root.querySelector('[data-cadeia]');
    if (!host || host.childElementCount) return;
    for (const f of FRUTAS) {
      if (f.id > 0) {
        const seta = document.createElement('span');
        seta.className = 'seta';
        seta.setAttribute('aria-hidden', 'true');
        seta.textContent = '›';
        host.appendChild(seta);
      }
      const S = 46 + f.id * 2.6;
      const cv = document.createElement('canvas');
      cv.width = cv.height = S * 2;
      cv.style.width = cv.style.height = S + 'px';
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', f.nome);
      const g = cv.getContext('2d');
      g.scale(2, 2);
      desenharFruta(g, f.id, S / 2, S / 2, S * 0.4, 0, 1, 1, 0.5 + f.id, { face: f.id * 5, feliz: 0.5 });
      host.appendChild(cv);
    }
  }

  renderMarcas() {
    const host = this.root.querySelector('[data-marcas]');
    if (!host) return;
    const m = this.app.dados.marcas;
    const n = (v) => (v || 0).toLocaleString('pt-BR');
    const linhas = [
      ['Colheitas', n(m.partidas)],
      ['Recorde de pontos', n(m.melhorPontos)],
      ['Maior fruta', m.melhorFruta >= 0 ? FRUTAS[m.melhorFruta].nome : '—'],
      ['Frutas combinadas', n(m.fusoes)],
      ['Bolos de festa', n(m.bolos)],
      ['Pedidos atendidos', n(m.pedidos)],
      ['Tempo brincando', this.tempo(m.tempo)],
      ['Frutas no álbum', `${this.app.dados.album.length} / ${FRUTAS.length}`],
    ];
    host.innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  tempo(seg) {
    const s = Math.floor(seg || 0);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h) return `${h}h ${m}min`;
    return `${m}min ${s % 60}s`;
  }

  renderResultado(jogo) {
    const host = this.root.querySelector('[data-resultado]');
    if (!host) return;
    const n = (v) => (v || 0).toLocaleString('pt-BR');
    const rec = this.app.dados.marcas.melhorPontos || 0;
    const linhas = [
      ['Pontos', n(jogo.pontos)],
      ['Maior fruta', jogo.maiorTier >= 0 ? FRUTAS[jogo.maiorTier].nome : '—'],
      ['Frutas combinadas', n(jogo.fusoes)],
      ['Melhor sequência', '×' + jogo.melhorCombo],
      ['Pedidos atendidos', n(jogo.pedidosFeitos)],
      ['Bolos de festa', n(jogo.bolos)],
      ['Lanches do tucano', n(jogo.tucanos)],
      ['Tempo', this.tempo(jogo.tempo)],
    ];
    host.innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')
      + (jogo.pontos >= rec && jogo.pontos > 0 ? '<div class="recorde"><dt>Recorde novo!</dt><dd>★</dd></div>' : '');
  }

  atualizarPausa(jogo) {
    const el = this.root.querySelector('[data-pausainfo]');
    if (el) {
      el.textContent = `${jogo.pontos.toLocaleString('pt-BR')} pontos · ${jogo.fusoes} frutas combinadas · ${jogo.fisica.bodies.length} na cesta`;
    }
  }
}
