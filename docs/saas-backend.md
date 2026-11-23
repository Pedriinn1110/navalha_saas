# Base do SaaS multiestabelecimento

## Decisões

- PostgreSQL e autenticação do Supabase. Senhas ficam sob responsabilidade do Supabase Auth, nunca em tabelas próprias.
- `shops` é a fronteira de cada barbearia; equipe, clientes, serviços, horários e agendamentos carregam `shop_id`.
- O dono da loja tem papel `owner`. Barbeiros têm papel `barber`, editam seu nome/foto/especialidade, veem sua própria agenda e clientes associados aos seus atendimentos.
- O cliente usa sua conta, vê seus próprios agendamentos e pode encontrar a loja pelo endereço público `/barbearia/{slug}`.
- A migração ativa Row Level Security e centraliza as regras de acesso no banco; esconder uma tela no navegador não substitui essas regras.

## Preparar o banco

1. Crie um projeto Supabase e configure URL e publishable key em `.env.local` usando `.env.example` como modelo.
2. Execute `supabase/migrations/202611230001_initial_multitenant.sql` no SQL Editor do projeto.
3. Em **Authentication → URL Configuration**, configure `http://localhost:3000` como Site URL e inclua `http://localhost:3000/auth/callback` nas Redirect URLs. Adicione também o domínio de produção quando publicar.
4. Use uma função/rota de servidor protegida com a secret key para criar contas e enviar convite por email a cada barbeiro. Nunca exponha essa chave no navegador.
5. No cadastro do dono, crie a conta no Auth e depois a linha em `shops`; o gatilho cria automaticamente o vínculo de proprietário.

## WhatsApp e descoberta

WhatsApp é adequado para confirmações, lembretes e atualizações de cancelamento. Ele não substitui a página pública da loja. Para enviar mensagens automatizadas, cada estabelecimento precisa conectar os ativos do WhatsApp Business Platform ou a plataforma precisa fazer onboarding dos estabelecimentos. Os segredos ficam exclusivamente no servidor; templates, webhooks e consentimento do cliente precisam ser configurados antes de ativar mensagens.

A página pública pode ser compartilhada como `https://seu-dominio/barbearia/corte-do-centro`. Depois, um diretório com busca por cidade/bairro e link para mapa pode ajudar clientes que ainda não conhecem o nome da loja.

## Estado desta etapa

A migração prepara o modelo relacional e o isolamento de dados. A interface ainda usa `localStorage`; ela só passará a usar o banco quando as telas de autenticação, agendamento, equipe e configurações forem migradas para consultas de servidor e sessões Supabase. Não copie senhas ou dados de sessão do protótipo para o banco.
