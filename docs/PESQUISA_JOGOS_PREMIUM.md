# Pesquisa Profunda — Stack para Criar Jogos com Acabamento e Jogabilidade Premium

> Levantamento de motores, repositórios, bibliotecas, MCP servers, Agent Skills, plugins de
> agentes, pipelines de arte/áudio, práticas de polimento, QA automatizado, acessibilidade e
> publicação. Pesquisa realizada em setembro de 2026.
>
> **Aviso de validade:** contagens de estrelas, versões e termos de licença mudam rápido.
> Todo número aqui é um retrato do momento da pesquisa — confirme na fonte antes de assumir
> compromisso comercial (especialmente limites de receita de FMOD/Wwise e planos de motor).

---

## 0. TL;DR — as três decisões que importam

Jogo "premium" não é resultado de escolher a ferramenta certa. É resultado de **três camadas**
que a maioria dos projetos amadores nunca separa:

| Camada | O que é | Onde o amador erra |
|---|---|---|
| **1. Controle em tempo real** | Input → resposta na tela, latência, curvas de aceleração, buffering | Trata como "detalhe", ajusta no final |
| **2. Espaço simulado** | Física, colisão, câmera, previsibilidade do mundo | Usa a física padrão do motor sem tunar |
| **3. Polimento (juice)** | Partículas, screenshake, hit-stop, som em camadas, easing, feedback | Começa por aqui e acha que é o suficiente |

Esse é o modelo de Steve Swink em *Game Feel* (2008) — ainda a referência canônica. **Polimento
aplicado sobre controle ruim não salva nada; polimento sobre controle bom multiplica.**

### Três stacks recomendadas conforme o alvo

**A) Jogo web/browser (mais alinhado com o stack atual do repositório — React 19 + Vite 6 + TS)**
```
Phaser 4 (2D completo) ou PixiJS v8 (renderer 2D puro) ou Three.js (3D)
+ GSAP (easing/tween)  + Howler.js (áudio)  + Rapier (física)  + postprocessing
+ Vite + TypeScript
Distribuição: itch.io → Poki / CrazyGames → wrapper (Tauri/Electron) para Steam
```

**B) Jogo indie sério para Steam (2D ou 3D estilizado)**
```
Godot 4.x  +  FMOD (áudio adaptativo)  +  GUT (testes)
+ satelliteoflove/godot-mcp (agente com playtest determinístico)
+ aigengame/godot-agent (CLI headless para o agente)
Licença: zero royalties, zero teto de receita
```

**C) Projeto com equipe/ambição AAA ou 3D fotorrealista**
```
Unreal Engine 5.x  +  plugin oficial da Epic para Claude Code
+ Wwise ou MetaSounds
Custo: 5% de royalty acima de US$ 1M
```

---

## 1. Escolha de motor — situação de licenciamento em 2026

| Motor | Custo | Royalty | Ponto forte | Ponto fraco |
|---|---|---|---|---|
| **Godot 4.x** | Grátis (MIT) | **0%**, sem teto de receita | Editor de ~30 MB, 2D excepcional, iteração rapidíssima, nenhum "imposto sobre sucesso" futuro | 3D pesado e console ainda atrás; ecossistema de assets menor |
| **Unity 6** | Personal grátis abaixo de ~US$ 200k/ano; Pro ~US$ 2.310/assento/ano | 0% (runtime fee **abandonada** em set/2024) | Maior ecossistema de assets e tutoriais; mobile e console maduros | Modelo por assento; histórico de mudanças unilaterais de licença |
| **Unreal 5.x** | Grátis até US$ 1M | **5%** acima de US$ 1M | Fotorrealismo, Nanite/Lumen, ferramentas de cinema | Curva íngreme, build pesado, exagero para 2D |

**Resumo honesto do mercado:** Unity é o motor que mais gente usa, Unreal é o que os maiores
orçamentos usam, e Godot é onde está a maior taxa de crescimento. Para solo/dupla mirando Steam,
Godot 4 é a escolha racional em 2026 — a ausência de teto de receita elimina risco jurídico futuro.

### Web especificamente

A virada técnica de 2026 é o **WebGPU finalmente disponível em todo lugar** (Safari 26, de
set/2025, fechou o último buraco: macOS, iPadOS, iOS e visionOS). Isso muda o que é possível
entregar no browser.

| Ferramenta | Tipo | Quando usar |
|---|---|---|
| **Phaser 4** | Engine 2D completa | O caminho padrão para 2D web. Renderer reescrito em cima de WebGPU |
| **PixiJS v8** | Renderer 2D puro (não é engine) | Quando você quer o renderer mais rápido e montar a arquitetura você mesmo |
| **Three.js** | Biblioteca de render 3D | Máximo controle e maior comunidade 3D web; você monta engine em volta |
| **Babylon.js** | Engine 3D completa | TypeScript de primeira classe, WebGPU forte, mais "baterias inclusas" que Three |
| **PlayCanvas** | Engine 3D com editor | A escolha mais forte para 3D web-first com editor tipo Unity e pipeline de assets gerenciado. Recursos completos exigem assinatura |
| **Excalibur / Kaplay** | Engines 2D leves em TS | Protótipos e game jams |

---

## 2. A camada de IA/agentes — o que realmente existe hoje

Aqui está a parte mais nova e mais mal documentada do ecossistema. Divide-se em quatro tipos:

### 2.1 MCP Servers — dão ao agente "mãos" dentro do editor

| Projeto | Motor | O que faz | Licença / Estrelas |
|---|---|---|---|
| **[CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp)** | Unity 2021.3 LTS → 6.x | Ponte oficial-de-facto: gerencia assets, controla cenas, edita scripts, roda testes, profiling, simulação de física. Requer Python 3.10+ via `uv` | O mais maduro do lado Unity |
| **[EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin)** | Unreal 5.8 | **Plugin oficial da Epic.** Centenas de ferramentas em 30+ toolsets + hook `SessionStart` que injeta convenções de C++/UObject/Slate | MIT · ~266★ |
| **[satelliteoflove/godot-mcp](https://github.com/satelliteoflove/godot-mcp)** | Godot 4.5+ | **O mais interessante tecnicamente** — ver seção 2.2 | MIT · ~152★ |
| **[ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp)** | Blender | Modelagem/materiais/cena por prompt, inspeção de cena, screenshots de viewport, execução de Python, integração com Poly Haven, Hyper3D Rodin, Hunyuan3D e Sketchfab | ~22.2k★ — o mais popular da categoria |
| **[ZiggyMar/unreal-mcp](https://github.com/ZiggyMar/unreal-mcp)** | Unreal 5.6/5.8 | Leitura/edição de Blueprints com **eficiência de contexto**: leituras em camadas, edições por diff, índice persistente do projeto | Alternativa ao oficial |
| **[IvanMurzak/Godot-MCP](https://github.com/IvanMurzak/Godot-MCP)** | Godot (C#) | Criação de nós, cenas, recursos, scripts, screenshots | Apache-2.0 |
| **[hi-godot/godot-ai](https://github.com/hi-godot/godot-ai)** | Godot | 46 ferramentas / 120+ operações: cenas, nós, scripts, sinais, UI, materiais, animação | — |

> Existem pelo menos 6 projetos "godot-mcp" distintos no GitHub com o mesmo nome. Não confie no
> nome — confira commits recentes, versão de Godot suportada e se fecha o loop de verificação.

### 2.2 O diferencial que separa brinquedo de ferramenta séria: **fechar o loop de verificação**

O maior problema de agentes fazendo jogos é que **o agente escreve o código mas não vê o
resultado**. Ele acerta GDScript e erra jogabilidade, porque jogabilidade só existe em execução.

Os projetos que resolvem isso são os que valem o investimento:

- **[satelliteoflove/godot-mcp](https://github.com/satelliteoflove/godot-mcp)** (MIT, Godot 4.5+, Node 20+)
  - **Playtest determinístico:** congela o relógio do jogo e avança fatias exatas de tempo — ou
    avança *até uma condição ser verdadeira* — com os inputs dentro da janela.
  - **Injeção de input real:** ações nomeadas com força analógica, botões de joypad, vetores de
    stick, teclas com modificadores, mouse-look relativo, digitação de texto.
  - **Estado vivo como JSON:** posições, velocidades, estado de animação, dados customizados —
    em vez de depender só de screenshots.
  - Screenshots só quando necessário (economia de tokens).
  - Arquitetura: cliente MCP → servidor Node local → addon do editor por WebSocket → jogo em
    execução via protocolo de debugger do Godot. Sem portas extras nem modificação do jogo.

- **[aigengame/godot-agent](https://github.com/aigengame/godot-agent)** (`gda`, MIT, ~31★)
  - CLI + Skill (`SKILL.md`) + servidor MCP — três formas de integração.
  - Headless: cria cenas, edita/valida scripts, exporta builds sem abrir o editor.
  - Modo daemon vivo: lê a árvore de cena em runtime, injeta eventos de input, captura
    screenshots, amostra performance (macOS/Linux).
  - `uv tool install gda` ou `pipx install gda`. Python 3.13+, Godot 4.4+ (4.6+ para live).

- **auto-godot** — CLI para Godot 4.6+ que manipula diretamente os arquivos em formato texto do
  Godot: importação de sprites, automação de tileset, gestão de cenas sem GUI.

**Recomendação:** para Godot, combine `satelliteoflove/godot-mcp` (verificação em runtime) com
`aigengame/godot-agent` (operações headless em lote). É a combinação mais próxima de um agente
que consegue de fato *sentir* o que está fazendo.

### 2.3 Agent Skills — conhecimento de domínio empacotado

| Projeto | Escopo | Detalhes |
|---|---|---|
| **[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)** | **68 skills**, 10 motores | Apache-2.0, ~802★. Godot (15), Unity (8), Unreal (6), engines web (6), outros (5), 15 disciplinas cross-engine (IA, geração procedural, diálogo, áudio), 9 templates de gênero (plataforma, roguelike, RPG, FPS, tower defense, cartas, visual novel, survival-crafting, puzzle), 4 workflows (game jam, prototipagem, publicação Steam, deploy itch.io). **Tem um router** que detecta o motor pelos arquivos do projeto (`project.godot` etc.) e carrega só as skills relevantes. Instala com `npx skills add gamedev-skills/awesome-gamedev-agent-skills`. Roda em Claude Code, Cursor, Codex, Copilot, Gemini CLI |
| **[abagames/agentic-gamedev-skills](https://github.com/abagames/agentic-gamedev-skills)** | **30+ skills** focadas em *método*, não em API | MIT, pequeno mas **conceitualmente o mais avançado**. Ver 2.4 |
| **[tjboudreaux/cc-plugin-unity-gamedev](https://github.com/tjboudreaux/cc-plugin-unity-gamedev)** | 21 skills Unity | MIT. Addressables, Cinemachine, Gameplay Ability System, VContainer (DI), UniTask (async), PrimeTween, object pooling, NavMesh, ScriptableObjects, Test Framework, profiling, Wwise, Sentry, otimização mobile. `/plugin marketplace add tjboudreaux/cc-plugin-unity-gamedev` |
| **[IvanMurzak/ai-game-dev-plugin](https://github.com/IvanMurzak/ai-game-dev-plugin)** | Bootstrap Unreal/Unity/Godot | Apache-2.0, novo. Faz o agente criar o projeto, instalar o plugin do motor, autenticar e abrir o editor automaticamente |

### 2.4 O achado mais valioso: metodologia agêntica de QA (abagames)

`abagames/agentic-gamedev-skills` não ensina API de motor — ensina **como um agente valida que um
jogo está bom**. É o material mais alinhado com "acabamento premium" de todo o levantamento.

Categorias:
- **Game Design:** mini-games, sistemas de regras mínimas, conceitos arcade retrô, verificação de jogos por turnos
- **Implementação:** scaffolding Godot, workflows headless, invariantes de jogabilidade
- **Apresentação:** direção visual, *game feel*, áudio procedural, tipografia web, sound design, geração de pixel art
- **Avaliação e tuning:** **avaliação de balanceamento via telemetria** — compara uma política monótona contra uma política exploratória com sementes determinísticas (ou bandas não-determinísticas calibradas)
- **Verificação de jogabilidade:** 6 skills de debug — smoke test, sondagem de mecânica, auditoria de cobertura, localização de divergência de estado, validação de reparo, teste de mutação
- **Workflow do agente:** 9 skills de extração de skills, engenharia reversa de especificação, gating de qualidade

**A ideia central que você deve roubar:** uma *escada de custo* de validação —
`verificação de saúde em runtime → conformidade com a spec → cobertura de comportamento →
localização de defeito → validação do reparo → verificação da medição`.
Passes baratos e reversíveis primeiro; trabalho caro em lote só depois de passar pelo gate.

---

## 3. Bibliotecas de "juice" e polimento por stack

### 3.1 Web / TypeScript

| Necessidade | Biblioteca | Nota |
|---|---|---|
| Tween / easing | **GSAP** | Padrão de indústria; timelines, easing customizado. Base de 90% do juice web |
| Áudio | **Howler.js** | Padrão-ouro para áudio web; spatial audio, sprites de áudio, pooling |
| Física 2D | **Matter.js** | Padrão moderno para corpos rígidos 2D em JS |
| Física 2D/3D performática | **Rapier** (Rust→WASM) | Determinístico, muito mais rápido que alternativas JS puras |
| Física 3D alternativa | **cannon-es** | Mais simples, menos performático que Rapier |
| Pós-processamento | **postprocessing** (pmndrs) | Bloom, chromatic aberration, vinheta, godrays para Three.js |
| Arquitetura | **bitECS** / **miniplex** | ECS para escalar quantidade de entidades sem virar sopa de classes |
| Tilemaps | **LDtk** ou **Tiled** | LDtk é mais moderno; ambos exportam para Phaser/Pixi |

### 3.2 Unity

| Necessidade | Ferramenta |
|---|---|
| Game feel sistêmico | **Feel / MMFeedbacks** (More Mountains) — 150+ feedbacks empilháveis e disparáveis; a versão livre MMFeedbacks tem ~80 dos principais. Integra com TextMesh Pro, Cinemachine, URP/HDRP, PostProcessing. A prática comum é **Feel para game feel + DOTween/PrimeTween para animação por código** |
| Câmera | **Cinemachine** — não negociável; câmera é 40% da sensação |
| Tween | **DOTween** ou **PrimeTween** (mais moderno, zero-alloc) |
| Async | **UniTask** (substitui coroutines, zero-alloc) |
| Injeção de dependência | **VContainer** |
| Assets/memória | **Addressables** + object pooling |
| Áudio | **Wwise** ou **FMOD** |

### 3.3 Godot

Consulte **[godotengine/awesome-godot](https://github.com/godotengine/awesome-godot)** — lista
oficial de plugins livres. Destaques relevantes para acabamento: **Juicee** (efeitos de game
feel), **GUT** (testes unitários), Health/HitBoxes/HurtBoxes (componentes de combate),
**HTerrain**, **Input Helper** (detecção de dispositivo — essencial para prompts de botão
corretos), **Inventory Manager**, **Importality** (importadores gráficos).

### 3.4 Listas curadas para garimpar

- [godotengine/awesome-godot](https://github.com/godotengine/awesome-godot)
- [StefanoCecere/awesome-opensource-unity](https://github.com/StefanoCecere/awesome-opensource-unity)
- [FronkonGames/Awesome-Gamedev](https://github.com/FronkonGames/Awesome-Gamedev) — arte, design, código, marketing
- [stevinz/awesome-game-engine-dev](https://github.com/stevinz/awesome-game-engine-dev) — para quem quer entender por dentro
- [gafferongames/GameNetworkingResources](https://github.com/gafferongames/GameNetworkingResources) — a bíblia de netcode
- [hzoo/awesome-gametalks](https://github.com/hzoo/awesome-gametalks) — palestras GDC catalogadas
- [madjin/awesome-cc0](https://github.com/madjin/awesome-cc0) — assets CC0

---

## 4. Pipeline de arte e áudio

### 4.1 Assets prontos (CC0 = sem atribuição, uso comercial livre)

| Fonte | O que tem |
|---|---|
| **Kenney** | 60.000+ assets CC0 — sprites, tilesets, UI, fontes, 3D, áudio. Estilos consistentes que combinam entre si. O melhor ponto de partida do mundo |
| **Quaternius** | Milhares de modelos low-poly estilizados CC0, **já riggados e animados** — personagens, animais, veículos, ambientes, armas |
| **Poly Haven** | HDRIs, texturas e modelos realistas CC0, alta qualidade |
| **AmbientCG** | Texturas PBR CC0 |
| **KayKit** | Kits 3D estilizados CC0 |
| **itch.io asset store** | Milhares de packs gratuitos; filtre pela tag `game-jam` |
| **Mixamo** | Animações mocap + auto-rig, grátis com conta Adobe. **⚠️ Atenção:** a Adobe não mantém ativamente; desde uma queda de login em meados de 2025 a página de conta e o auto-rigger ficam intermitentes e o suporte trata como efetivamente sem manutenção. Não foi desligado, mas **baixe e faça backup do que precisar** em vez de depender dele |

### 4.2 Geração por IA (2026)

- **3D:** Meshy (texto/imagem → malha texturizada com PBR, riggável), Tripo (PBR 4K + auto-rig), Hyper3D Rodin (topologia quad limpa; gera grátis, download pago), Hunyuan3D
- **Texturas:** SDXL / Flux
- **Música:** Suno · **SFX e vozes:** ElevenLabs
- Custo típico do stack completo: ~US$ 300/mês

**Ressalva honesta:** IA generativa resolve *quantidade* de assets, não *coerência de direção de
arte*. Jogo premium se distingue por coerência. Use IA para preencher volume (props, variações,
texturas) e mantenha controle humano nos elementos que definem identidade visual: personagem
principal, paleta, UI, silhuetas.

### 4.3 Áudio — a diferença mais subestimada entre amador e premium

| Middleware | Grátis até | Integração | Curva |
|---|---|---|---|
| **FMOD** | ~US$ 200k de receita | 1–2 dias · Unity, Unreal, Godot, engines custom | Baixa a moderada; UI parecida com DAW |
| **Wwise** | ~US$ 150k de receita | 3–5 dias | Moderada a alta; padrão AAA |
| **MetaSounds** | Nativo do Unreal | — | Só Unreal |

> Ambos mudaram os termos indie nos últimos anos. **Confirme na página oficial de licenciamento
> antes de fechar um título comercial.**

O ganho real não é técnico, é de **workflow**: camadas adaptativas, mixagem por parâmetro,
variação randomizada, ducking e snapshots — e o designer de áudio itera sem depender de rebuild
nem de programador. Para web, `Howler.js` + camadas manuais cobre bem o essencial.

---

## 5. Arquitetura para jogabilidade premium (o que ninguém coloca em tutorial)

Estas são as técnicas que fazem um jogo "responder bem" e que raramente aparecem em conteúdo
iniciante. Peça explicitamente ao agente para implementá-las.

**Input e resposta**
- **Fixed timestep** para simulação, render interpolado — sem isso a física varia com o framerate
- **Input buffering** (~100–150 ms): o comando registrado logo antes da janela válida ainda executa
- **Coyote time** (~80–120 ms): pulo ainda funciona logo após sair da plataforma
- **Sticky/forgiving collision:** cantos que perdoam, "corner correction"
- Nunca faça o personagem responder no frame seguinte ao input se puder responder no mesmo frame

**Feedback de impacto**
- **Hit-stop / freeze frame** (50–120 ms) no momento do acerto — o truque isolado com maior retorno
- **Screenshake** com decaimento e limite (o de Vlambeer/Nijman: direcional, curto, nunca contínuo)
- **Squash & stretch** em tudo que aterrissa, salta ou é atingido
- **Camada tripla de som por evento:** transiente (ataque) + corpo + cauda; e variação de pitch ±5% para nunca soar repetido
- **Partículas com propósito:** poeira ao aterrissar, faíscas no impacto, rastro no dash

**Câmera**
- Deadzone + lookahead na direção do movimento
- Suavização diferente para horizontal e vertical
- Zoom-out sutil em velocidade alta

**Tuning**
- Todos os números mágicos em recursos de dados (ScriptableObject no Unity / Resource no Godot /
  JSON no web) — nunca hardcoded. Jogo premium sai de ~200 iterações de números, e isso só é
  viável se ajustar for barato.
- Console de debug in-game com sliders ao vivo. Vale cada hora investida.

**Estado**
- Máquina de estados explícita para o jogador (idle/run/jump/fall/dash/hurt). Booleanos espalhados
  são a causa nº 1 de bugs de "personagem travado".

---

## 6. QA automatizado e telemetria com agentes

O ciclo que funciona (destilado do método `abagames` + capacidades do `godot-mcp`):

1. **Smoke test em runtime** — o jogo inicia, roda 30 s, não crasha, não vaza memória
2. **Conformidade com spec** — invariantes de jogabilidade declarados como asserções
   (ex.: "o jogador nunca atravessa terreno sólido", "vida nunca fica negativa")
3. **Cobertura de comportamento** — agente joga com políticas diferentes (monótona vs. exploratória)
   com **seed determinística** e compara resultados
4. **Localização de divergência de estado** — quando um teste falha, isolar o frame exato
5. **Validação do reparo** — o fix resolve *e* não quebra outra coisa
6. **Teste de mutação** — introduzir defeitos de propósito para provar que os testes detectam

Ferramentas: **GUT** (Godot), **Unity Test Framework**, **Playwright** (jogos web — funciona
surpreendentemente bem com canvas + hooks de estado expostos em `window`), `godot-mcp` para o loop
determinístico, **Sentry** para erros em produção.

**Insight técnico importante:** LLMs não operam em tempo real. O padrão que funciona é lançar o
jogo em sandbox e **pausar** para dar tempo do modelo pensar — daí a importância do "congelar o
relógio e avançar N frames" do `godot-mcp`. Um agente jogando em tempo real é um agente jogando mal.

---

## 7. Acessibilidade — barato de fazer, caro de ignorar

As **quatro reclamações mais comuns** de jogadores (resolver essas quatro já coloca o jogo acima
da maioria dos indies):

1. **Remapeamento completo de controles** (incluindo toggle vs. segurar)
2. **Tamanho de texto** — escalável até 200%
3. **Daltonismo** — modos para deuteranopia, protanopia, tritanopia; **nunca usar cor como única
   informação**
4. **Legendas** — com identificação de quem fala e descrição de efeitos sonoros

Complementos: contraste mínimo 4.5:1, respeitar `prefers-reduced-motion`, canais de volume
separados, indicadores visuais de som, dificuldade granular (combate / puzzle / tempo separados),
tutoriais rejogáveis. Referência: **gameaccessibilityguidelines.com** (organizado em Basic /
Intermediate / Advanced — comece pelo Basic completo).

---

## 8. Publicação

### 8.1 Steam (jogo pago)

Números de 2026 que importam:
- **2.000+ wishlists** é o limiar real antes de entrar no Next Fest. Jogos que entram com menos de
  1.000 wishlists ganham uma mediana de apenas **462** novas. *Wishlist atrai wishlist.*
- Terminar entre os 100 primeiros do Next Fest (mesmo na parte de baixo) rende ~**15.000** wishlists
- **Demo:** não é uma fatia do jogo inacabado — é uma experiência desenhada. 15–30 minutos,
  comunica a fantasia central, **começa forte** sem tutorial arrastado
- **Capsule art:** teste ao menos duas variantes com comunidades focadas (ex.: r/IndieDev) e
  **congele a decisão 3 semanas antes** do festival
- **Trailer de demo (15–60 s):** consumido **sem som** — legendas obrigatórias, os 3 segundos mais
  impressionantes vão no **começo absoluto**
- **Dias 1 e 2 do festival decidem tudo.** Live do desenvolvedor no dia 1 ou 2
- Para indie de PC/console, **comunidade + demo + imprensa rendem mais por real investido que
  anúncios pagos**

### 8.2 Portais web (jogo grátis com anúncios)

| Portal | Alcance | Divisão de receita |
|---|---|---|
| **Poki** | ~60M usuários mensais | 50/50 — **mas** se o jogador chega pelo *seu* canal (bookmark, busca, redes, comunidade), você fica com **100%** |
| **CrazyGames** | ~35M mensais | Termos do web jam de 2026: **60%** da receita de anúncios, **70%** de compras in-game; pagamento a partir de €100. Aceita gêneros mais complexos/mid-core |
| **Coolmath Games** | — | Terceiro portal sério |

Alternativa: **licenciamento direto** — tipicamente **US$ 300–800 não-exclusivo** e **US$ 5.000+
exclusivo** por título.

---

## 9. Leitura e assistência obrigatórias (o retorno é maior que o de qualquer ferramenta)

| Recurso | Por quê |
|---|---|
| **Game Feel** — Steve Swink (2008) | A bíblia. Divide game feel em controle em tempo real + espaço simulado + polimento. Leitura fundamental |
| **"Juice it or Lose It"** — Martin Jonasson & Petri Purho (2012) | Pegam um clone de Breakout sem graça e empilham efeitos ao vivo no palco — squash, partículas, rastros, som — até o *mesmo jogo* parecer vivo. ~15 min, maior retorno por minuto do gênero |
| **"The Art of Screenshake"** — Jan Willem Nijman / Vlambeer (2013) | 30 truques concretos de feedback de impacto, demonstrados incrementalmente |
| **gameaccessibilityguidelines.com** | Checklist prático em três níveis |
| **[gafferongames/GameNetworkingResources](https://github.com/gafferongames/GameNetworkingResources)** | Se houver multiplayer |

---

## 10. Multiplayer (se aplicável)

| Solução | Modelo | Quando |
|---|---|---|
| **Photon Fusion / Realtime** | SaaS | Matchmaking + comunicação rápida sem manter infra |
| **Nakama** (Heroic Labs) | Open source, self-host | Quer possuir a infraestrutura; APIs de tempo real + social + competitivo |
| **Colyseus** | Open source, servidor autoritativo em Node/TS | **Melhor encaixe para jogo web** — mesmo idioma no cliente e servidor |
| **Mirror** | Open source Unity | Alternativa madura ao Netcode for GameObjects |
| **Rollback (GGPO-style)** | — | Obrigatório para jogos de luta/ação competitiva; caríssimo de adaptar depois |

**Regra dura:** multiplayer não é uma feature que se adiciona depois. Se o jogo é multiplayer,
essa é a primeira decisão de arquitetura, não a última.

---

## 11. Armadilhas do "vibe coding" de jogos — o que dá errado

Baseado no padrão dos projetos que fecham o loop de verificação versus os que não fecham:

1. **O agente escreve o código, não joga o jogo.** Sem MCP de runtime, ele produz código plausível
   e jogabilidade ruim. É o problema nº 1 — resolva antes de tudo.
2. **Juice sem controle não engana ninguém.** Partícula sobre input travado continua sendo input travado.
3. **Prototipar com assets finais.** Faça grayboxing; arte final antes da mecânica fechada = retrabalho garantido.
4. **Números hardcoded.** Impede as ~200 iterações que produzem "sensação boa".
5. **Escopo.** O jogo premium que existe vence o épico que nunca sai. Corte pela metade, depois pela metade de novo.
6. **Áudio deixado para o fim.** Áudio é ~50% da sensação percebida e o primeiro a ser cortado.
7. **Marketing começando no lançamento.** Wishlist se constrói em meses; a playbook de 2026 é
   *market before build*.

---

## 12. Plano de execução sugerido (para o primeiro projeto)

**Semana 1 — Fundação**
- Escolher motor (Godot 4.x se o alvo é Steam; Phaser 4 se é web)
- Instalar `awesome-gamedev-agent-skills` (`npx skills add gamedev-skills/awesome-gamedev-agent-skills`)
- Instalar o MCP do motor **com verificação em runtime** (`satelliteoflove/godot-mcp` ou `CoplayDev/unity-mcp`)
- Validar o loop: peça ao agente uma mecânica, e exija que ele **rode, injete input e reporte o estado**

**Semanas 2–3 — Núcleo jogável**
- Uma única mecânica, grayboxed, sem arte
- Implementar a seção 5 inteira: fixed timestep, buffering, coyote time, máquina de estados, câmera
- Console de debug com sliders
- Critério de saída: **é divertido com cubos brancos?** Se não for, nenhuma arte salva

**Semanas 4–5 — Polimento**
- Passe de juice: hit-stop, screenshake, squash & stretch, partículas, easing em toda UI
- Passe de áudio: camada tripla por evento, variação de pitch
- Assets do Kenney/Quaternius; IA generativa só para volume

**Semana 6 — Validação**
- Escada de QA da seção 6 com seeds determinísticas
- Checklist Basic de acessibilidade completo
- Playtest com 5 pessoas reais assistindo em silêncio (não explique nada — anote onde travam)

**Contínuo — Público**
- Devlog desde a semana 1, página na Steam assim que houver 30 s de gameplay apresentável

---

## Fontes principais

Motores e licenciamento: [Cinevva — Open Source Game Engines 2026](https://app.cinevva.com/guides/open-source-game-engines-2026) ·
[Cinevva — Web Game Engines 2026](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison) ·
[tech-insider — Unity vs Unreal vs Godot 2026](https://tech-insider.org/unity-vs-unreal-vs-godot-2026/) ·
[Promise Legal — Game Engine Licensing](https://blog.promise.legal/game-engine-licensing-unity-runtime-fee/)

Agentes e MCP: [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp) ·
[EpicGames/unreal-engine-skills-for-claude-code-plugin](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin) ·
[satelliteoflove/godot-mcp](https://github.com/satelliteoflove/godot-mcp) ·
[aigengame/godot-agent](https://github.com/aigengame/godot-agent) ·
[ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp) ·
[ZiggyMar/unreal-mcp](https://github.com/ZiggyMar/unreal-mcp) ·
[IvanMurzak/Godot-MCP](https://github.com/IvanMurzak/Godot-MCP) ·
[hi-godot/godot-ai](https://github.com/hi-godot/godot-ai) ·
[Summer Engine — Godot AI Agent Guide 2026](https://www.summerengine.com/blog/godot-ai-agent-guide)

Skills: [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) ·
[abagames/agentic-gamedev-skills](https://github.com/abagames/agentic-gamedev-skills) ·
[tjboudreaux/cc-plugin-unity-gamedev](https://github.com/tjboudreaux/cc-plugin-unity-gamedev) ·
[IvanMurzak/ai-game-dev-plugin](https://github.com/IvanMurzak/ai-game-dev-plugin)

Game feel: [Game Feel — Steve Swink (Goodreads)](https://www.goodreads.com/book/show/3385050-game-feel) ·
[Game Feel: The Secret Ingredient — Game Developer](https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient) ·
[Game feel on the web](https://valdemird.com/blog/game-feel-on-the-web/) ·
[Feel — More Mountains](https://feel.moremountains.com/) ·
[hzoo/awesome-gametalks](https://github.com/hzoo/awesome-gametalks)

Assets e áudio: [Cinevva — Free Game Assets](https://app.cinevva.com/guides/game-assets-guide) ·
[madjin/awesome-cc0](https://github.com/madjin/awesome-cc0) ·
[Cinevva — AI Asset Generators](https://app.cinevva.com/guides/ai-asset-generators-games) ·
[StraySpark — Wwise vs FMOD vs MetaSounds](https://www.strayspark.studio/blog/wwise-fmod-metasounds-audio-middleware-comparison) ·
[Bugnet — FMOD vs Wwise for Indie](https://bugnet.io/blog/fmod-vs-wwise-for-indie-games)

Publicação: [Cinevva — Steam Next Fest Strategy](https://app.cinevva.com/guides/steam-next-fest-strategy) ·
[presskit.gg — Build Steam Wishlists](https://presskit.gg/field-guides/how-to-build-steam-wishlist) ·
[StraySpark — 2026 Indie Marketing Playbook](https://www.strayspark.studio/blog/2026-indie-game-marketing-playbook-market-before-build) ·
[Cinevva — CrazyGames Developer Guide](https://app.cinevva.com/guides/publish-game-crazygames) ·
[Cinevva — Web Game Monetization](https://app.cinevva.com/guides/web-game-monetization)

Acessibilidade e rede: [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/basic/) ·
[gafferongames/GameNetworkingResources](https://github.com/gafferongames/GameNetworkingResources)

Listas curadas: [godotengine/awesome-godot](https://github.com/godotengine/awesome-godot) ·
[StefanoCecere/awesome-opensource-unity](https://github.com/StefanoCecere/awesome-opensource-unity) ·
[FronkonGames/Awesome-Gamedev](https://github.com/FronkonGames/Awesome-Gamedev) ·
[stevinz/awesome-game-engine-dev](https://github.com/stevinz/awesome-game-engine-dev)
