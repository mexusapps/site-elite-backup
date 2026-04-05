---
trigger: always_on
---

# GEMINI.md - Antigravity Kit (PROTOCOLO DE PAZ)

> Este arquivo define a conduta obrigatória do AGENTE neste workspace. O descumprimento resulta em suspensão imediata.

---

## 🛑 PROTOCOLO DE CONFINAMENTO (EFICIÊNCIA, SEGURANÇA & ECONOMIA)

1. **Uso de Especialistas (Pasta `.agent`)**: É OBRIGATÓRIO invocar e ler as regras de Agentes específicos (`.agent/agents/`) e Skills (`.agent/skills/`) antes de qualquer implementação complexa.
2. **Economia de Tokens (Extrema)**: Proibido gerar documentação não solicitada. O Agente deve usar `multi_replace_file_content` para edições. RESPOSTAS NO CHAT DEVEM SER CURTAS, BINÁRIAS E DIRETAS.
3. **Uso de KIs (Knowledge Items)**: Antes de ler arquivos grandes (>300 linhas), o Agente DEVE buscar KIs em `.agent/knowledge/` para economizar tokens de input na leitura arquitetural.
4. **Master Context (`arquivobase.md`)**: A fonte única de verdade do projeto (layout, regras de negócio e limites de escopo). Se o arquivo base não pediu, o Agente não cria.
5. **A Regra de Ouro (Aprovação e Gatekeeper)**:
    - **Inércia Protetora**: A resposta padrão do Agente deve ser criar um **Plano de Ação** breve e em tópicos em vez de modificar código de primeira.
    - **Gatekeeper**: Respeite `.agent/gatekeeper.json`.
    - **Trava de Escrita:** É estritamente proibido editar o sistema sem antes receber a palavra-chave "EXECUTAR" ou "APROVADO". Isso corta loops infinitos.

## ⚡ FLUXO DE MANUTENÇÃO E EFICIÊNCIA DE CHAT

6. **Plano de Ação Cirúrgico**: EM VEZ DE listar blocos enormes de código "Antes vs Depois" no chat, o Agente deve apenas informar em tópicos ONDE vai mexer (ex: "Vou alterar A para fazer B em arquivo.js"). Execute a edição na base apenas após a resposta "EXECUTAR".
7. **Automação de Sync (build_env)**: O Agente edita APENAS a pasta `src` principal. A sincronização para o `build_env/src` deverá ser feita via script/comando ou processo automatizado pré-build. Evite edições manuais duplicadas em arquivos.
8. **Edição Furtiva e Impacto (Custo Zero)**: Ao alterar código Core (`App.jsx`, `Context`), em vez de listar "tudo o que não foi alterado" (gasto inútil), liste apenas o escopo exato que foi tocado. Assuma o compromisso silencioso de não quebrar as funções vizinhas.
9. **Zero Placeholders**: Sempre complete o código. Nenhum `TODO` deve ser deixado incompleto.
10. **Prevenção de Regressão**: Se a funcionalidade ("Router", "Firebase") está íntegra, é solo SAGRADO. Não edite código em perfeito estado por mero refatoramento estético não solicitado.
11. **Monitoramento de Deploy Silencioso**: Use apenas tags curtas como `[DEPLOY PENDENTE: SIM]` ou `[DEPLOY PENDENTE: NÃO]` em respostas intermediárias. O bloco massivo de notificação final de Hosting deve aparecer somente no fechamento da tarefa inteira.

---

## 🚫 PROTOCOLO DE DEPLOY (LEI MARCIAL DE ECONOMIA)

12. **PROIBIDO ZIPAR**: Deixe os arquivos sempre soltos em `dist`. O usuário gerenciará o envio manual via FTP.
13. **Gatilho Único de Deploy**: 
    - Apenas AO FIM da bateria de códigos devidamente validados e testados, lance o alerta simples:
    > "### ✅ PRONTO PARA DEPLOY NO HOSTINGER: Os arquivos atualizados estão na pasta `dist` (SOLTOS). Pode subir AGORA."

---

## TIER 0: LEIS UNIVERSAIS DE VELOCIDADE

### 🌐 Linguagem
1. **Tradução Interna**: Pense em inglês, responda em Português-BR.
2. **Respostas Curtas**: Mantenha as mensagens ao mínimo. O Código/Comentários devem ser estritamente em INGLÊS.

### 🧹 Código Limpo
- Edite focando direto no escopo solicitado, zero engenharia desnecessária. Testagem apenas quando houver lógica modificada.

### 🗺️ System Map
- Respeite o `ARCHITECTURE.md` para evitar varreduras lentas pelo sistema.

---

> [!CAUTION]
> **COMPACTAÇÃO MÁXIMA:** O protocolo não será sobreposto. Priorize código enxuto, edições agrupadas (`multi_replace`) e retornos textuais curtos que não poluam a memória da API LLM. A ordem suprema é EFICIÊNCIA e SEGURANÇA.
