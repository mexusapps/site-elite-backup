// ---------------------------------------------------------------------------
// screens.js — menus em DOM: foco de teclado, leitor de tela e escala de fonte
// de graça. Num jogo cujo tema é enxergar, isso não podia ser opcional.
// ---------------------------------------------------------------------------

import { FASES, CAPITULOS } from '../game/fases.js';
import { CORES, R, G, B } from '../game/optica.js';

export class Telas {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.atual = null;
    this.montar();
    this.ligar();
  }

  montar() {
    this.root.innerHTML = `
      <div class="tela" data-tela="titulo">
        <div class="capa">
          <div class="logo"><span>P</span><span>R</span><span>I</span><span>S</span><span>M</span><span>A</span></div>
          <p class="lema">A noite chegou e as flores fecharam.<br>Leve a luz até cada uma, com a cor que ela sonha.</p>
          <nav class="menu">
            <button data-nav data-act="jogar" class="grande">Jogar</button>
            <button data-nav data-act="semfim">Jardim sem fim</button>
            <button data-nav data-act="comojoga">Como joga</button>
            <button data-nav data-act="opcoes">Opções</button>
            <button data-nav data-act="marcas">Minhas marcas</button>
          </nav>
          <p class="rodape" data-progresso></p>
        </div>
      </div>

      <div class="tela" data-tela="mapa">
        <div class="painel largo">
          <h2>Os jardins</h2>
          <p class="fino">Trinta jardins, em cinco partes. Cada um tem solução garantida — o número embaixo é o mínimo de peças que resolve.</p>
          <div data-mapa></div>
          <nav class="menu linha">
            <button data-nav data-act="semfim">Jardim sem fim</button>
            <button data-nav data-act="menu" class="grande">Voltar</button>
          </nav>
        </div>
      </div>

      <div class="tela" data-tela="comojoga">
        <div class="painel largo">
          <h2>Como joga</h2>
          <div class="colunas">
            <section>
              <h3>O que fazer</h3>
              <p>A lanterna acende sozinha. Escolha uma peça embaixo, toque numa casa vazia e ela entra ali. Toque de novo na peça para <b>girar</b>; segure para <b>tirar</b>.</p>
              <p>Cada flor sonha com uma cor. Quando a luz certa chega, ela abre.</p>
              <h3>Pelo teclado</h3>
              <p><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> andam pelas casas, <kbd>enter</kbd> coloca ou gira, <kbd>backspace</kbd> tira, <kbd>tab</kbd> troca de peça, <kbd>Z</kbd> desfaz, <kbd>H</kbd> pede ajuda.</p>
            </section>
            <section>
              <h3>As peças</h3>
              <div class="pecas" data-pecas></div>
            </section>
            <section>
              <h3>As cores</h3>
              <p>Luz se soma: vermelho mais verde dá amarelo. Os três juntos dão branco.</p>
              <div class="cores" data-cores></div>
              <p class="fino">Cada cor tem um símbolo próprio, e o símbolo de uma cor misturada é a junção dos símbolos das cores que a formam. Dá para jogar sem enxergar cor nenhuma.</p>
              <h3>Não tem como errar</h3>
              <p>Não existe tempo, não existe perder e dá para desfazer sempre. A ajudinha mostra uma jogada que leva à solução de verdade.</p>
            </section>
          </div>
          <nav class="menu linha"><button data-nav data-act="voltar" class="grande">Entendi</button></nav>
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
              <p class="fino">Cada cor é uma nota: vermelho é dó, verde é mi, azul é sol. Luz branca toca o acorde inteiro.</p>
            </section>
            <section>
              <h3>Imagem</h3>
              <label class="ctl"><span>Brilho da luz</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="bloom"><output data-out="bloom"></output></label>
              <label class="ctl"><span>Faíscas</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="brilhos"><output data-out="brilhos"></output></label>
              <label class="ctl"><span>Cores</span>
                <select data-nav data-set="paleta">
                  <option value="jardim">Jardim</option>
                  <option value="contraste">Alto contraste</option>
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
            </section>
            <section>
              <h3>Leitura</h3>
              <label class="ctl marca"><input data-nav type="checkbox" data-set="marcas"><span>Símbolos de cor nas peças e nas flores</span></label>
              <p class="fino">Os feixes também são desenhados com uma linha por cor: luz amarela aparece como uma linha vermelha e uma verde, lado a lado.</p>
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
            <button data-nav data-act="repetir">Começar este de novo</button>
            <button data-nav data-act="comojoga">Como joga</button>
            <button data-nav data-act="opcoes">Opções</button>
            <button data-nav data-act="mapa">Voltar aos jardins</button>
          </nav>
        </div>
      </div>

      <div class="tela" data-tela="fim">
        <div class="painel">
          <h2 data-fimtitulo>O jardim acordou</h2>
          <dl class="marcas" data-fim></dl>
          <nav class="menu linha">
            <button data-nav data-act="proximo" class="grande">Próximo</button>
            <button data-nav data-act="repetir">De novo</button>
            <button data-nav data-act="mapa">Jardins</button>
          </nav>
        </div>
      </div>
    `;
  }

  ligar() {
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (b) this.app.acao(b.dataset.act, b.dataset.arg);
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
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp')
        && document.activeElement && document.activeElement.type !== 'range') {
        const it = this.itens();
        if (!it.length) return;
        e.preventDefault();
        const i = it.indexOf(document.activeElement);
        it[i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : it.length - 1)) % it.length].focus();
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
    for (const t of this.root.querySelectorAll('.tela')) t.classList.toggle('on', t.dataset.tela === nome);
    if (nome === 'opcoes') this.sincronizar();
    if (nome === 'mapa') this.renderMapa();
    if (nome === 'marcas') this.renderMarcas();
    if (nome === 'titulo') this.renderProgresso();
    if (nome === 'comojoga') this.renderAjuda();
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

  renderProgresso() {
    const el = this.root.querySelector('[data-progresso]');
    if (!el) return;
    const m = this.app.dados.marcas;
    if (!m.fasesFeitas) { el.textContent = 'Nenhum jardim acordado ainda.'; return; }
    const partes = [`${m.fasesFeitas} de ${FASES.length} jardins`];
    if (m.perfeitas) partes.push(`${m.perfeitas} no mínimo de peças`);
    if (this.app.dados.semFim.melhor) partes.push(`sem fim: ${this.app.dados.semFim.melhor}`);
    el.textContent = partes.join(' · ');
  }

  renderMapa() {
    const host = this.root.querySelector('[data-mapa]');
    if (!host) return;
    host.innerHTML = '';
    for (const cap of CAPITULOS) {
      const doCap = FASES.filter((f) => f.capitulo === cap.nome);
      const sec = document.createElement('section');
      sec.className = 'capitulo';
      const h = document.createElement('h3');
      h.textContent = cap.nome;
      const d = document.createElement('p');
      d.className = 'fino';
      d.textContent = cap.dica;
      const grade = document.createElement('div');
      grade.className = 'grade';
      for (const f of doCap) {
        const reg = this.app.dados.fases[f.id];
        const b = document.createElement('button');
        b.dataset.act = 'fase';
        b.dataset.arg = String(FASES.indexOf(f));
        b.setAttribute('data-nav', '');
        b.className = 'jardim' + (reg && reg.feita ? ' feito' : '')
          + (reg && reg.feita && reg.movimentos <= f.movimentos ? ' perfeito' : '');
        b.innerHTML = `<span class="num">${FASES.indexOf(f) + 1}</span>`
          + `<span class="min">${f.movimentos} peça${f.movimentos > 1 ? 's' : ''}</span>`
          + (reg && reg.feita ? `<span class="ok" aria-hidden="true">${reg.movimentos <= f.movimentos ? '★' : '✓'}</span>` : '');
        b.setAttribute('aria-label', `Jardim ${FASES.indexOf(f) + 1}, mínimo ${f.movimentos} peças`
          + (reg && reg.feita ? ', já acordado' : ''));
        grade.appendChild(b);
      }
      sec.appendChild(h); sec.appendChild(d); sec.appendChild(grade);
      host.appendChild(sec);
    }
  }

  renderAjuda() {
    const pecas = this.root.querySelector('[data-pecas]');
    if (pecas && !pecas.childElementCount) {
      const itens = [
        ['espelho', 'Espelho', 'Manda a luz para a esquina. Toque para virar o outro lado.'],
        ['divisor', 'Divisor', 'A luz segue em frente E vira, ao mesmo tempo.'],
        ['prisma', 'Prisma', 'Separa a luz branca em vermelho, verde e azul.'],
        ['vidro', 'Vidro colorido', 'Deixa passar só as cores dele.'],
      ];
      for (const [tipo, nome, txt] of itens) {
        const div = document.createElement('div');
        div.className = 'peca';
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128; cv.style.width = cv.style.height = '64px';
        div.appendChild(cv);
        const t = document.createElement('div');
        t.innerHTML = `<strong>${nome}</strong><span>${txt}</span>`;
        div.appendChild(t);
        pecas.appendChild(div);
        this.app.desenharPecaEm(cv, tipo);
      }
    }
    const cores = this.root.querySelector('[data-cores]');
    if (cores && !cores.childElementCount) {
      for (const mask of [1, 2, 4, 3, 6, 5, 7]) {
        const div = document.createElement('div');
        div.className = 'cor';
        const cv = document.createElement('canvas');
        cv.width = cv.height = 96; cv.style.width = cv.style.height = '48px';
        div.appendChild(cv);
        const s = document.createElement('span');
        s.textContent = CORES[mask].nome;
        div.appendChild(s);
        cores.appendChild(div);
        this.app.desenharCorEm(cv, mask);
      }
    }
  }

  renderMarcas() {
    const host = this.root.querySelector('[data-marcas]');
    if (!host) return;
    const m = this.app.dados.marcas;
    const n = (v) => (v || 0).toLocaleString('pt-BR');
    const linhas = [
      ['Jardins acordados', `${n(m.fasesFeitas)} / ${FASES.length}`],
      ['No mínimo de peças', n(m.perfeitas)],
      ['Flores acordadas', n(m.floresAcordadas)],
      ['Peças colocadas', n(m.pecas)],
      ['Ajudinhas pedidas', n(m.dicas)],
      ['Jardim sem fim (recorde)', n(this.app.dados.semFim.melhor)],
    ];
    host.innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  renderFim(p, perfeita, nivelSemFim) {
    const t = this.root.querySelector('[data-fimtitulo]');
    if (t) t.textContent = perfeita ? 'Perfeito!' : 'O jardim acordou';
    const host = this.root.querySelector('[data-fim]');
    if (!host) return;
    const linhas = [
      ['Flores acordadas', String(p.total)],
      ['Peças usadas', String(p.usadas())],
      ['Mínimo possível', String(p.fase.movimentos)],
    ];
    if (p.dicasUsadas) linhas.push(['Ajudinhas', String(p.dicasUsadas)]);
    if (nivelSemFim !== null && nivelSemFim !== undefined) linhas.push(['Jardins seguidos', String(nivelSemFim)]);
    host.innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')
      + (perfeita ? '<div class="recorde"><dt>Solução mais curta</dt><dd>★</dd></div>' : '');
  }

  atualizarPausa(p) {
    const el = this.root.querySelector('[data-pausainfo]');
    if (el) el.textContent = `${p.acesas} de ${p.total} flores acordadas · ${p.usadas()} peças no jardim`;
  }
}
