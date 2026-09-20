# BOARD — Mapa Mental Estratégico

Data: 20/09/2026  
Status: aprovado para planejamento  
Projeto: `AUREON-TECH/BOARD`

## Objetivo

Transformar o BOARD em um quadro estratégico completo, combinando o canvas livre atual com um modo de mapa mental. O usuário poderá começar por uma ideia central, criar ramificações, nomear e mover pontos, conectá-los e desenhar livremente com mouse ou toque.

## Experiência principal

1. O usuário cria um projeto ou abre uma página.
2. Pode inserir uma ideia central ou escolher um modelo de mapa mental.
3. Ao selecionar um ponto, um botão `+` cria um novo ponto conectado automaticamente.
4. O usuário também pode ativar a ferramenta de conexão e ligar quaisquer dois pontos manualmente.
5. Pontos podem ser arrastados, renomeados, coloridos e ter formatos diferentes.
6. O usuário pode desenhar livremente, apagar traços, desfazer e refazer ações.
7. Zoom e movimentação permitem trabalhar em mapas maiores.
8. O projeto continua sendo salvo automaticamente no dispositivo e disponível offline.
9. O modo apresentação exibe somente o conteúdo do quadro em tela cheia.

## Ferramentas do quadro

- Seleção e movimentação.
- Mão para deslocar o canvas.
- Ideia central.
- Novo ponto ou subponto.
- Texto.
- Nota.
- Retângulo, círculo e ponto arredondado.
- Conector e seta.
- Caneta para desenho livre.
- Borracha.
- Excluir.
- Desfazer e refazer.
- Zoom para mais, menos e ajuste à tela.

## Pontos e conexões

Cada ponto terá:

- identificador único;
- tipo e formato;
- texto;
- posição e dimensão;
- cor de fundo, borda e texto;
- identificador do ponto pai, quando houver;
- ordem e nível da ramificação.

As conexões serão objetos separados, contendo origem, destino, estilo, cor e direção. Ao mover um ponto, suas conexões acompanharão automaticamente.

## Organização automática

A primeira versão terá organização radial simples:

- ideia principal no centro;
- ramificações distribuídas ao redor;
- subpontos posicionados próximos do ponto pai;
- opção de reorganizar o mapa sem impedir ajustes manuais.

O usuário sempre poderá mover os elementos depois da organização automática.

## Desenho livre

Os traços serão armazenados como sequências de pontos, cor e espessura. O desenho funcionará com mouse, caneta digital e toque. Durante o desenho, o gesto não deve arrastar o quadro nem selecionar blocos.

## Tela e navegação

O canvas será maior que a área visível e permitirá deslocamento e zoom. No celular, os controles principais ficarão acessíveis sem depender do painel lateral de páginas. Toques terão alvos grandes e o usuário poderá alternar claramente entre selecionar, mover e desenhar.

## Salvamento e compatibilidade

O formato salvo evoluirá para uma nova versão, mantendo a leitura dos projetos atuais. Serão persistidos:

- páginas;
- pontos e blocos;
- conexões;
- desenhos;
- zoom e posição do canvas;
- nome do projeto.

O salvamento continuará local e offline nesta etapa. Nenhum projeto existente será apagado.

## Componentes técnicos

A implementação será separada em unidades pequenas:

- estado e migração dos projetos;
- renderização de pontos;
- renderização de conexões;
- desenho livre;
- transformação do canvas, zoom e deslocamento;
- histórico de desfazer/refazer;
- barra de ferramentas e propriedades;
- persistência local;
- modo apresentação.

## Tratamento de erros

- Recuperar o último estado válido quando o salvamento estiver corrompido.
- Impedir conexões para elementos inexistentes.
- Remover conexões associadas quando um ponto for excluído.
- Limitar zoom a uma faixa segura.
- Evitar que gestos simultâneos criem itens acidentalmente.

## Verificação

Serão verificados:

- criação de ideia central, pontos e subpontos;
- conexão automática e manual;
- movimentação com atualização das linhas;
- desenho e borracha com mouse e toque;
- desfazer e refazer;
- salvamento e reabertura;
- migração de projetos antigos;
- funcionamento offline;
- responsividade no Galaxy A14 e desktop;
- modo apresentação;
- instalação como PWA.

## Fora desta primeira entrega

- colaboração em tempo real;
- contas de usuário e sincronização na nuvem;
- inteligência artificial gerando mapas;
- edição simultânea por várias pessoas;
- exportação avançada para PowerPoint.

Essas funções podem ser adicionadas posteriormente sem alterar a base do editor.
