# GYMFIT

Plataforma SaaS multiacademia em **Next.js 16 + TypeScript + Supabase + Vercel**, com identidade preto e verde neon.

## Painéis e perfis

- **ADM da plataforma**: cria academias e o Master de cada academia; acompanha visão consolidada.
- **Master**: proprietário/sócio; controla academia, unidades, equipe, alunos, financeiro, CRM e relatórios.
- **Gerente**: operação, vendas, alunos, agenda, equipe e módulos autorizados.
- **Treinador**: alunos, treinos, avaliações e retenção.
- **Aluno**: dashboard pessoal, treinos, evolução, aulas e financeiro próprio.

## Módulos incluídos

Academias, multiunidades, usuários e permissões, alunos, planos, contratos, financeiro, CRM, agenda, treinos, exercícios detalhados e logs de treino, avaliações físicas, controle de acesso, equipe e escalas, estoque/PDV, marketing, notificações, retenção e churn, tarefas, gamificação, pontos, recompensas, indicações, bem-estar e hábitos, comunidade, NPS/pesquisas, conteúdo sob demanda, vendas, comissões, integrações, webhooks, migração de dados, ocupação histórica, BI, equipamentos, manutenção e base para Smart Gym/IoT.

Integrações externas como WhatsApp, gateway de pagamento/Pix Automático, IA generativa, reconhecimento facial, catracas, wearables e IoT exigem credenciais e fornecedores externos. O banco e a arquitetura já possuem pontos de extensão para esses módulos.

---

## 1. Criar o projeto no Supabase

1. Crie um projeto no Supabase.
2. Abra **SQL Editor**.
3. Copie todo o conteúdo de `supabase/migrations/001_gymfit.sql`.
4. Execute o SQL inteiro.
5. Em **Project Settings / API**, copie:
   - Project URL
   - Publishable key
   - Secret key

> A Secret key é administrativa. Nunca coloque essa chave em variável `NEXT_PUBLIC_*`.

---

## 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
SUPABASE_SECRET_KEY=sua_chave_secreta_apenas_servidor
```

---

## 3. Criar o ADM inicial

Depois de executar o SQL e configurar as variáveis:

```bash
npm install
GYMFIT_ADMIN_PASSWORD='SUA_SENHA' npm run seed:admin
```

No PowerShell do Windows:

```powershell
$env:GYMFIT_ADMIN_PASSWORD='SUA_SENHA'
npm run seed:admin
```

O seed cria o usuário **Victor**. Use a senha definida temporariamente em `GYMFIT_ADMIN_PASSWORD`; ela não fica gravada no repositório.

O login converte internamente o usuário para o identificador de autenticação `victor@gymfit.local`. O usuário entra normalmente digitando apenas **Victor**.

Por segurança, troque a senha assim que o ambiente estiver em produção.

---

## 4. Testar localmente

```bash
npm run dev
```

Abra `http://localhost:3000`.

Verificação de saúde:

```text
/api/health
```

---

## 5. Enviar ao GitHub

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "GYMFIT sistema inicial completo"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

O `.gitignore` já impede o envio de `.env.local`, chaves e arquivos locais de build.

---

## 6. Publicar na Vercel

1. Na Vercel, clique em **Add New → Project**.
2. Importe o repositório GitHub do GYMFIT.
3. A Vercel detectará Next.js.
4. Em **Environment Variables**, adicione as três variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
5. Marque-as para Production e Preview conforme sua necessidade.
6. Clique em **Deploy**.

Depois de alterar uma variável de ambiente, faça um novo deploy para que a alteração seja aplicada.

---

## Segurança implementada

- Supabase Auth para senhas e sessões.
- SSR com cookies.
- RLS habilitado nas tabelas de negócio.
- Isolamento por `organization_id`.
- Papéis: `platform_admin`, `master`, `manager`, `trainer`, `student`.
- Secret key somente em rotas server-side e script de seed.
- Criação de academia + Master com rollback em caso de falha.
- Logs de auditoria para criação de academia e usuários.
- Perfis de aluno limitados pelos vínculos e políticas RLS.

## Observação sobre produção

Antes de receber clientes reais, configure domínio próprio, política de privacidade/LGPD, backups, SMTP transacional, monitoramento, gateway de pagamento e provedores de mensageria/acesso que serão usados pela operação.

## Validações realizadas antes da entrega

- `npm run lint` — aprovado sem erros e sem avisos.
- `npm run build` — build de produção aprovado.
- SQL principal analisado por parser PostgreSQL (`pglast`) — sintaxe aprovada.
- `npm audit --audit-level=moderate` — 0 vulnerabilidades encontradas após override compatível de PostCSS.

