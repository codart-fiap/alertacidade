# Alerta Cidade — Front-end Web

Interface web do projeto Pluvia, desenvolvida com React e Vite. O Alerta Cidade apresenta áreas de risco, sensores, alertas e pontos seguros, e permite que o cidadão consulte uma recomendação a partir de uma localização. Quando conectado à API, as operações administrativas disponíveis no backend também podem ser usadas pelo painel do gestor.

## Escopo do front-end mobile

O documento da Global Solution não especifica uma tecnologia obrigatória para a implementação do front-end mobile. Após esclarecer essa dúvida com o tutor da turma, **Lucas Silva Borges Sousa**, foi adotada a possibilidade de desenvolver essa parte como uma aplicação web, com foco em **mobile first**. Assim, o Alerta Cidade é uma aplicação web responsiva, projetada para priorizar o uso em dispositivos móveis.

## Requisitos

- Node.js e npm instalados
- API Pluvia configurada e em execução para usar dados reais (veja o README do repositório `pluvia-api`)

## Como executar

### 1. Obtenha os projetos

Clone ou baixe os repositórios do front-end (`alertacidade-web`) e do backend (`pluvia-api`). Para conectar os dois localmente, mantenha-os disponíveis na mesma máquina.

Link do repositório do front: https://github.com/codart-fiap/alertacidade

Link do repositório do back/API: https://github.com/codart-fiap/alertacidade-pluvia

### 2. Configure e inicie a API

Na pasta `pluvia-api`, siga as seções **Como executar → Banco de dados** e **Como executar → API** do [README do Pluvia](../pluvia-api/README.md). Em resumo, é necessário ter JDK 17+, Maven 3.9+ e PostgreSQL 14+, criar o banco `pluvia`, configurar o `.env` do backend e iniciar a API:

```powershell
mvn spring-boot:run
```

A API deve ficar disponível em `http://localhost:8080`. O front usa os endpoints publicados na raiz da URL, por exemplo `http://localhost:8080/areas-risco`, sem o sufixo `/api`.

### 3. Configure a URL da API no front

Na pasta `alertacidade-web`, crie o arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Confirme que o arquivo `.env` contém a URL base da API:

```env
VITE_API_URL=http://localhost:8080
```

Se a API estiver em outro endereço ou porta, substitua o valor pela origem correta. Não acrescente `/api` nem uma barra final. O `.env` é ignorado pelo Git e deve permanecer local. Sempre que alterar essa variável, pare e inicie novamente o servidor Vite para que a configuração seja carregada.

### 4. Instale as dependências e inicie o front

Em outro terminal, na pasta `alertacidade-web`, execute:

```powershell
npm install
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`.

### 5. Entre no painel do gestor (opcional)

O acesso cidadão às consultas é público. Para testar as operações administrativas, use a conta de demonstração documentada no README do backend (`admin@pluvia.com` / `Admin@123`) na tela de acesso do gestor. A senha é enviada ao endpoint de login e as operações protegidas usam o token JWT retornado pela API.

## Conexão entre o front e a API

O cliente HTTP está em `src/services/apiClient.js`. Ele lê `VITE_API_URL` e consulta os recursos do Pluvia, incluindo:

- `POST /auth/login` para autenticação;
- `GET /areas-risco`, `/sensores`, `/alertas` e `/pontos-seguros` para carregar o painel e o mapa;
- `GET /recomendacao?lat=...&lng=...` para consultar orientação de localização;
- operações administrativas em `/areas-risco` e `/pontos-seguros`, além do envio de leituras em `/sensores/{id}/leituras`.

As consultas públicas não exigem login. Escritas administrativas dependem de um usuário ADMIN autenticado; o front envia o JWT como `Authorization: Bearer <token>`. O backend permite por padrão o acesso do Vite em `localhost` e `127.0.0.1`, portas `5173` e `5174`. Se usar outra origem, ajuste `CORS_ALLOWED_ORIGINS` no `.env` da API conforme o README do Pluvia.

Sem `VITE_API_URL`, o front usa dados simulados locais para a interface. Para trabalhar com o backend, configure a variável acima antes de iniciar o Vite.

## Problemas comuns

- **Não foi possível conectar à API:** confira se o backend iniciou em `http://localhost:8080` e se `VITE_API_URL` está correto; reinicie o Vite depois de alterar o `.env`.
- **Erro de CORS no navegador:** confira se a URL aberta no navegador usa `localhost` ou `127.0.0.1` na porta `5173`/`5174`, ou inclua a origem usada em `CORS_ALLOWED_ORIGINS` no backend.
- **Erro 401 ou 403 ao salvar/alterar dados:** autentique-se com uma conta ADMIN. As operações de escrita são protegidas pela API.
- **Painel vazio ou sem os dados esperados:** confirme se o banco foi criado e se a API tem dados de demonstração; as instruções de carga inicial estão no README do Pluvia.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local de desenvolvimento (porta `5173`) |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente a versão gerada em `dist/` |

## Uso de IA generativa

Durante o desenvolvimento do front-end, ferramentas de IA generativa, como Claude e ChatGPT, foram utilizadas como apoio, com revisão e entendimento da equipe antes de aplicar sugestões ao projeto.

**Onde foram usadas:**

- **Depuração e explicação de erros:** apoio para interpretar problemas de execução no React/Vite e falhas de integração com a API, incluindo conexão e CORS.
- **Integração com o Pluvia:** auxílio para estruturar e revisar chamadas HTTP, o uso da URL configurada por variável de ambiente, o envio do token de autenticação e a transformação das respostas da API para os dados apresentados pela interface.
- **Mapa e apresentação dos dados:** apoio para implementar e revisar a exibição de áreas de risco, sensores, alertas e pontos seguros, além da interação com a consulta de recomendação por localização.
- **Revisão de textos:** apoio na organização e clareza de textos da interface e desta documentação, sem substituir as decisões técnicas da equipe.

As sugestões de IA foram lidas, verificadas e ajustadas pela equipe para se integrarem ao código e aos endpoints do Pluvia. A equipe é responsável pelo funcionamento e pelo conteúdo final do projeto.

## Observação

Os dados iniciais de áreas, coordenadas, sensores e pontos seguros do Pluvia são fictícios e servem para demonstração. Consulte o README do backend para detalhes sobre o banco, a API, a autenticação e a simulação de sensores.
