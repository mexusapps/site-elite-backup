// ---------------------------------------------------------------------------
// screens.js — menus em DOM: foco de teclado, leitor de tela e escala de fonte
// vêm de graça. Canvas é ótimo para o jogo e péssimo para menu.
//
// A tela que mais importa é a de fim de fase: é onde a evolução acontece. Ela
// não é um relatório, é um momento — a habilidade nova aparece grande, com o
// nome, o desenho e a frase de uso, antes dos números.
// ---------------------------------------------------------------------------

import { FASES } from '../game/niveis.js';
import { HABILIDADES } from '../game/regras.js';

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
          <div class="logo"><span>B</span><span>O</span><span>L</span><span>O</span><span>T</span><span>A</span></div>
          <p class="lema">Uma sementinha quer chegar ao alto da clareira.<br>Onde ela encosta, a mata desperta.</p>
          <nav class="menu">
            <button data-nav data-act="jogar" class="grande">Jogar</button>
            <button data-nav data-act="mapa">Escolher fase</button>
            <button data-nav data-act="comojoga">Como joga</button>
            <button data-nav data-act="opcoes">Opções</button>
            <button data-nav data-act="marcas">Minhas marcas</button>
          </nav>
          <p class="rodape" data-progresso></p>
        </div>
      </div>

      <div class="tela" data-tela="mapa">
        <div class="painel largo">
          <h2>A trilha</h2>
          <p class="fino">O primeiro capítulo já está de pé. Os outros estão brotando.</p>
          <div data-mapa></div>
          <nav class="menu linha">
            <button data-nav data-act="menu" class="grande">Voltar</button>
          </nav>
        </div>
      </div>

      <div class="tela" data-tela="comojoga">
        <div class="painel largo">
          <h2>Como joga</h2>
          <div class="colunas">
            <section>
              <h3>O salto</h3>
              <p><b>Segure</b> o botão do mouse (ou o dedo na tela) para preparar o salto. <b>Mova</b> para escolher a direção — o arco de pontinhos mostra onde ela vai cair. <b>Solte</b> para saltar.</p>
              <p>Quanto mais tempo segurando, mais forte. O anel em volta da Bolota fecha quando chega no máximo.</p>
              <h3>Pelo teclado</h3>
              <p><kbd>←</kbd><kbd>→</kbd> giram a mira, <kbd>espaço</kbd> segura e solta o salto, <kbd>R</kbd> recomeça a fase, <kbd>P</kbd> ou <kbd>esc</kbd> pausa.</p>
            </section>
            <section>
              <h3>A mata acorda</h3>
              <p>Os <b>botões adormecidos</b> abrem quando a Bolota passa perto: viram folha-plataforma ou cogumelo-mola, e mudam o caminho de verdade. Cada um também vira o seu ponto de volta.</p>
              <p>As <b>gotas de orvalho</b> são opcionais. Ficam sempre um tiquinho fora do caminho fácil — pegar as três é o desafio de verdade da fase.</p>
              <h3>Ninguém se machuca</h3>
              <p>Não existe morrer aqui. Caindo fora do mapa, o vento traz a Bolota de volta ao último lugar que ela fez florescer.</p>
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
              <p class="fino">Todo o som é gerado na hora: marimba, vento e passarinho. Nenhum arquivo de áudio.</p>
            </section>
            <section>
              <h3>Imagem</h3>
              <label class="ctl"><span>Brilho da luz</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="bloom"><output data-out="bloom"></output></label>
              <label class="ctl"><span>Faíscas</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="brilhos"><output data-out="brilhos"></output></label>
              <label class="ctl"><span>Tremor de câmera</span><input data-nav type="range" min="0" max="1" step="0.05" data-set="tremor"><output data-out="tremor"></output></label>
              <label class="ctl"><span>Qualidade</span>
                <select data-nav data-set="qualidade">
                  <option value="auto">Automática</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </label>
              <label class="ctl"><span>Tamanho do texto</span>
                <select data-nav data-set="tamanhoTexto">
                  <option value="1">Normal</option>
                  <option value="1.25">Grande</option>
                  <option value="1.5">Maior</option>
                  <option value="2">Enorme</option>
                </select>
              </label>
            </section>
            <section>
              <h3>Ajuda</h3>
              <label class="ctl"><span>Arco do salto</span>
                <select data-nav data-set="mira">
                  <option value="auto">Enquanto preparo</option>
                  <option value="sempre">Sempre visível</option>
                </select>
              </label>
              <p class="fino">Deixando tudo em zero o jogo continua inteiro: nenhum efeito carrega informação sozinho.</p>
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
            <button data-nav data-act="repetir">Começar de novo</button>
            <button data-nav data-act="comojoga">Como joga</button>
            <button data-nav data-act="opcoes">Opções</button>
            <button data-nav data-act="menu">Sair para o início</button>
          </nav>
        </div>
      </div>

      <div class="tela" data-tela="fim">
        <div class="painel">
          <h2 data-fimtitulo>Chegou!</h2>
          <div data-evolucao></div>
          <dl class="marcas" data-fim></dl>
          <p class="fino" data-fimnota></p>
          <nav class="menu linha">
            <button data-nav data-act="proximo" class="grande">Continuar</button>
            <button data-nav data-act="repetir">De novo</button>
            <button data-nav data-act="menu">Início</button>
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
    return Array.from(t.querySelectorAll('[data-nav]:not([disabled])'))
      .filter((el) => el.offsetParent !== null);
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
    const d = this.app.dados;
    const m = d.marcas;
    if (!m.fasesFeitas) { el.textContent = 'A trilha ainda não começou.'; return; }
    const partes = [`${m.fasesFeitas} de ${FASES.length} fase${FASES.length > 1 ? 's' : ''}`];
    if (m.gotas) partes.push(`${m.gotas} gota${m.gotas > 1 ? 's' : ''} de orvalho`);
    if (d.habilidades.length > 1) partes.push(`${d.habilidades.length} habilidades`);
    el.textContent = partes.join(' · ');
  }

  renderMapa() {
    const host = this.root.querySelector('[data-mapa]');
    if (!host) return;
    host.innerHTML = '';
    const caps = [];
    for (const f of FASES) if (!caps.includes(f.capitulo)) caps.push(f.capitulo);
    for (const cap of caps) {
      const sec = document.createElement('section');
      sec.className = 'capitulo';
      const h = document.createElement('h3');
      h.textContent = cap;
      const grade = document.createElement('div');
      grade.className = 'grade';
      for (const f of FASES.filter((x) => x.capitulo === cap)) {
        const i = FASES.indexOf(f);
        const reg = this.app.dados.fases[f.id];
        const b = document.createElement('button');
        b.dataset.act = 'fase';
        b.dataset.arg = String(i);
        b.setAttribute('data-nav', '');
        b.className = 'fase' + (reg && reg.feita ? ' feita' : '');
        const gotas = reg ? (reg.gotas || []).length : 0;
        b.innerHTML = `<span class="num">${i + 1}</span><span class="nome">${f.nome}</span>`
          + `<span class="gotas">${'●'.repeat(gotas)}${'○'.repeat(f.orvalho.length - gotas)}</span>`
          + (reg && reg.feita ? `<span class="ok" aria-hidden="true">✓</span>` : '');
        b.setAttribute('aria-label', `Fase ${i + 1}, ${f.nome}`
          + (reg && reg.feita ? `, feita, ${gotas} de ${f.orvalho.length} gotas` : ', ainda não feita'));
        grade.appendChild(b);
      }
      sec.appendChild(h); sec.appendChild(grade);
      host.appendChild(sec);
    }
    const aviso = document.createElement('p');
    aviso.className = 'fino';
    aviso.textContent = 'Mais capítulos estão sendo plantados.';
    host.appendChild(aviso);
  }

  renderMarcas() {
    const host = this.root.querySelector('[data-marcas]');
    if (!host) return;
    const m = this.app.dados.marcas;
    const n = (v) => (v || 0).toLocaleString('pt-BR');
    const linhas = [
      ['Fases completas', `${n(m.fasesFeitas)} / ${FASES.length}`],
      ['Saltos dados', n(m.saltos)],
      ['Gotas de orvalho', n(m.gotas)],
      ['Voltas do vento', n(m.quedas)],
      ['Habilidades', n(this.app.dados.habilidades.length)],
    ];
    host.innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  /**
   * @param r {saltos, gotas, totalGotas, quedas, tempo, melhor, recorde, novaHabilidade}
   */
  renderFim(r) {
    const t = this.root.querySelector('[data-fimtitulo]');
    if (t) {
      t.textContent = r.gotas === r.totalGotas
        ? 'Clareira inteira!' : r.recorde ? 'Novo recorde!' : 'Chegou!';
    }

    // o momento de evolução vem antes dos números
    const ev = this.root.querySelector('[data-evolucao]');
    if (ev) {
      if (r.novaHabilidade) {
        const h = HABILIDADES[r.novaHabilidade];
        ev.className = 'evolucao';
        ev.innerHTML = `<div class="selo" aria-hidden="true">🌿</div>`
          + `<div><span class="rot">A Bolota aprendeu</span>`
          + `<strong>${h.nome}</strong><span class="desc">${h.desc}</span></div>`;
      } else { ev.className = ''; ev.innerHTML = ''; }
    }

    const host = this.root.querySelector('[data-fim]');
    if (host) {
      const linhas = [
        ['Saltos', String(r.saltos) + (r.recorde ? ' ★' : r.melhor ? ` · melhor ${r.melhor}` : '')],
        ['Orvalho', `${r.gotas} de ${r.totalGotas}`],
        ['Tempo', `${r.tempo.toFixed(1)}s`],
      ];
      if (r.quedas) linhas.push(['Voltas do vento', String(r.quedas)]);
      host.innerHTML = linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    }

    const nota = this.root.querySelector('[data-fimnota]');
    if (nota) {
      nota.textContent = r.gotas < r.totalGotas
        ? 'Ficaram gotas para trás. Com a habilidade nova dá para alcançar todas.'
        : 'Nada ficou para trás nesta clareira.';
    }
  }

  atualizarPausa(p) {
    const el = this.root.querySelector('[data-pausainfo]');
    if (el) {
      el.textContent = `${p.fase.nome} · ${p.saltos} salto${p.saltos === 1 ? '' : 's'}`
        + ` · ${p.gotas} de ${p.totalGotas} gotas`;
    }
  }
}
