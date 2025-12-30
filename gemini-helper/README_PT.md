# Gemini-helper

> Gemini Helper: Gerenciamento e exportação de conversas, navegação por esboço, gerenciamento de prompts, melhorias de abas (status/privacidade/notificação), histórico de leitura e restauração, âncora bidirecional/manual, remoção de marca d'água, correção de negrito, cópia de fórmulas/tabelas, bloqueio de modelo, embelezamento de página, alternância de tema, modo escuro inteligente (Gemini/Gemini Enterprise)

🌐 **Idioma**: [简体中文](README.md) | [English](README_EN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | **Português** | [Русский](README_RU.md)

## ✨ Recursos

### 📝 Gerenciamento de Prompts

- **Inserção rápida**: Inserir com um clique prompts frequentemente usados no chat
- **Gerenciamento de categorias**: Filtrar, renomear e excluir categorias
- **Função de busca**: Encontrar rapidamente os prompts que você precisa
- **Operações CRUD**: Personalizar e gerenciar sua biblioteca de prompts
- **Função de cópia**: Copiar com um clique o conteúdo do prompt para a área de transferência
- **Arrastar e ordenar**: Ajustar livremente a ordem de exibição dos prompts

### 📁 Gerenciamento de Conversas

- **Arquivo de pastas**: Criar pastas personalizadas para organizar o histórico de chat
- **Tags multicoloridas**: Mais de 30 cores tradicionais chinesas, suporta cores personalizadas e gerenciamento multi-tag
- **Busca em tempo real**: Filtro rápido por título, suporta filtragem por combinação de tags
- **Operações em lote**: Multi-seleção para exclusão, movimentação e arquivamento em lote
- **Exportar conversa**: Exportar para formato Markdown/JSON/TXT, imagens convertíveis para Base64
- **Sincronização fluida**: Sincronização automática dos dados mais recentes da barra lateral do Gemini (compatível com Standard/Enterprise)

### 📑 Navegação por Esboço

- **Extração automática**: Extrair estrutura de títulos das respostas da IA (suporta Standard e Enterprise Shadow DOM)
- **Agrupamento de consultas do usuário**: Agrupar esboço por turnos de conversa, consultas do usuário como cabeçalhos de grupo (ícone 💬)
- **Recuo inteligente**: Ajuste automático de recuo com base no nível mais alto para reduzir espaço em branco à esquerda
- **Salto rápido**: Clicar no item do esboço para rolagem suave e destaque por 2 segundos
- **Rolagem sincronizada**: Destaque automático do item do esboço correspondente ao rolar a página (alternável nas configurações)
- **Filtro de nível**: Configurar exibição de nível de título, Nível 0 para colapsar rapidamente apenas para consultas do usuário
- **Controle de alternância**: Ocultar automaticamente aba de esboço quando desativado

### 🚀 Navegação Rápida

- **Ir para início/fim**: Posicionamento rápido em conversas longas
- **Grupo de botões flutuantes**: Acessível mesmo quando o painel está colapsado

### 📐 Largura da Página

- **Largura personalizada**: Suporta unidades de pixels (px) e porcentagem (%)
- **Aplicação instantânea**: Aplicar imediatamente após ajuste, sem necessidade de atualização
- **Configuração independente**: Diferentes configurações para diferentes sites

### ⚓ Sistema de Posicionamento Inteligente

Dois sistemas independentes de registro de posição:

- **Histórico de leitura (Reading Progress)**:
  - "Memória de progresso de leitura" de longo prazo, suporta restauração entre atualizações/sessões
  - Registro automático ao rolar, persistido no GM_storage
  - Restauração automática ao carregar página ou mudar de conversa

- **Âncora Bidirecional**:
  - "Ponto de retorno" de curto prazo, similar a voltar no navegador ou `git switch -`
  - Salvar automaticamente posição atual ao clicar em botões esboço/topo/fim
  - Suporta alternância ida e volta entre duas posições

### 🏷️ Melhorias de Abas

- **Exibição de status de geração**: Exibir automaticamente ícone ⏳ (gerando) ou ✅ (concluído) no título da aba
- **Formato de título personalizado**: Suporta combinações de placeholder `{status}{title}[{model}]`
- **Modo Privacidade (Tecla Chefe)**: Disfarçar com um clique o título da aba como "Google", ocultar conteúdo da conversa
- **Notificação de conclusão**: Enviar notificação de desktop quando a geração em segundo plano for concluída
- **Foco automático da janela**: Trazer automaticamente a janela do navegador para frente quando a geração for concluída

### ⚙️ Painel de Configurações

- **Troca de aba**: Três abas - Prompts, Esboço, Configurações
- **Configurações do painel**: Personalizar expandido/colapsado por padrão, ocultar automaticamente ao clicar fora
- **Correção de entrada chinesa**: Alternância opcional para corrigir problema do primeiro caractere no Enterprise
- **Troca de idioma**: Suporta Chinês simplificado/Chinês tradicional/Inglês

### 🎯 Adaptação Inteligente

- ✅ Gemini Standard (gemini.google.com)
- ✅ Gemini Enterprise (business.gemini.google)

### 🌓 Modo Escuro Automático

- **Detecção inteligente**: Acompanhamento em tempo real da alternância de modo claro/escuro do sistema/página
- **Adaptação completa**: Esquema de cores do tema escuro cuidadosamente ajustado, confortável para os olhos

### 📋 Assistência de Conteúdo

- **Cópia de fórmula com duplo clique**: Duplo clique em fórmula matemática para copiar fonte LaTeX, adicionar delimitadores automaticamente
- **Cópia de tabela Markdown**: Adicionar botão de cópia no canto superior direito da tabela, cópia direta em formato Markdown
- **Remoção de marca d'água**: Remover automaticamente marca d'água NanoBanana de imagens geradas pelo Gemini AI
- **Ajuste à borda**: Ocultar automaticamente ao arrastar painel para borda da tela, mostrar ao passar o cursor
- **Âncora manual**: Definir/retornar/limpar posição de âncora com barra de ferramentas rápida

## 📸 Visualização

- Painel flutuante no lado direito, suporta arrastar e mover (experiência otimizada, sem seleção acidental de texto)
- Tema gradiente, aparência bonita
- Barra flutuante mostra prompt atual, suporta limpeza com um clique

![Conversas](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/gemini-helper/images/gemini-helper-6.png)

## 🔧 Como Usar

1. Instalar extensão de navegador Tampermonkey
2. Instalar este script
3. Abrir página do Gemini, o painel de gerenciamento de prompts aparece no lado direito
4. Clicar no prompt para inserir rapidamente

## ⌨️ Operações Rápidas

| Operação | Descrição |
| --- | --- |
| Clicar no prompt | Inserir na caixa de entrada |
| 📋 Botão copiar | Copiar conteúdo do prompt |
| ☰ Alça de arrasto | Arrastar para ajustar ordem |
| ✏ Botão editar | Editar prompt |
| 🗑 Botão excluir | Excluir prompt |
| ⚙ Gerenciamento de categorias | Renomear/excluir categoria |
| Clicar botão × | Limpar conteúdo inserido |
| Enter para enviar | Ocultar automaticamente barra flutuante |
| Botões ⬆ / ⬇ | Ir para início/fim da página |

## 🐛 Feedback

Para problemas ou sugestões, por favor forneça feedback em [GitHub Issues](https://github.com/urzeye/tampermonkey-scripts/issues)

## 📄 Licença

MIT License
