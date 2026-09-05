# PageLinks — briefing

*25/08/2026 · Bruno Santana*

## O problema de hoje

As páginas de links dos clientes estão em WordPress, uma instalação por cliente.
Isso significa: atualizar um link é entrar no WP, achar a página, editar no Elementor
e publicar. Multiplicado por cliente. Some manutenção de plugin, tema e atualização
de versão.

O trabalho não é difícil, é repetido — e repetição manual é exatamente o que o
sistema deve absorver.

## O que o PageLinks precisa ser

1. **Um sistema, muitos clientes.** Todas as páginas servidas pela mesma aplicação
2. **Painel próprio de gestão.** Listar clientes, criar página, adicionar e reordenar
   cards, editar informações e tema — sem código
3. **Migração do que já existe.** As páginas atuais do WordPress entram no sistema
4. **Facilidade de atualização.** Trocar um link tem que levar segundos, não minutos

## Decisões tomadas (25/08/2026)

1. **Endereço:** o domínio **dnms.fun** já existe e já roda nos clientes. Cada página
   fica em `dnms.fun/<slug>`. Nada de domínio se conecta agora — **primeiro o sistema
   inteiro funcionando, depois a ligação**
2. **Quem edita:** só a Dunamis por enquanto. O banco já nasceu preparado para o
   cliente entrar depois (`Usuario.papel` = admin | cliente, com `clienteId`), sem
   precisar de migração para liberar
3. **Banco:** SQLite local durante a construção, com schema portátil. Virar
   PostgreSQL/Supabase é trocar o provider e o adapter — nenhuma reescrita

## Migração — feita em 26/08/2026

As 59 páginas publicadas no dnms.fun foram catalogadas pelos prints e importadas, com
tema e estrutura de blocos. O material de origem está em `material/`: a listagem
oficial, os prints e o catálogo em JSON.

O conteúdo exato dos blocos não foi copiado — os prints não têm resolução para isso, e
o Bruno pediu justamente para deixar os espaços prontos para preencher pelo painel.

## Fora do escopo por enquanto

- Loja, checkout ou pagamento dentro da página
- Analytics próprio (usar Google Analytics / Meta Pixel do cliente)
- App mobile
