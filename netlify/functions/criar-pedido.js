exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ sucesso: false, erro: "Método não permitido." })
    };
  }

  try {
    const dados = JSON.parse(event.body || "{}");

    const {
      tipo,
      produto,
      tema,
      oferta,
      publico,
      objetivo,
      cta,
      duracao,
      estilo,
      voz,
      idioma,
      visual,
      referencias,
      intensidade
    } = dados;

    if ((!produto || !produto.trim()) && (!tema || !tema.trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          sucesso: false,
          erro: "Informe o produto/serviço ou descreva o conteúdo."
        })
      };
    }

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          sucesso: false,
          erro: "GITHUB_TOKEN não configurado no Netlify."
        })
      };
    }

    const referenciasTexto =
      Array.isArray(referencias) && referencias.length
        ? referencias.join(", ")
        : "Nenhuma selecionada";

    const corpoIssue = `### TIPO DE CONTEÚDO
${tipo || "Anúncio"}

### PRODUTO OU SERVIÇO
${produto || "Não informado"}

### TEMA
${tema || "Não informado"}

### OFERTA
${oferta || "Não informada"}

### PÚBLICO-ALVO
${publico || "Não informado"}

### OBJETIVO
${objetivo || "Vender"}

### CHAMADA PARA AÇÃO
${cta || "Não informada"}

### DURAÇÃO
${duracao || "30 segundos"}

### ESTILO
${estilo || "Oferta direta"}

### VOZ
${voz || "Natural"}

### IDIOMA
${idioma || "Português"}

### VISUAL
${visual || "Vídeos reais"}

### REFERÊNCIAS
${referenciasTexto}

### INTENSIDADE DAS REFERÊNCIAS
${intensidade || "Equilibrada"}

### ORIENTAÇÃO EDITORIAL
As referências são somente orientação de estilo.

O conteúdo final deve ser original.
Não copie frases, roteiros, títulos, textos,
exemplos específicos, sequências identificáveis
ou bordões de terceiros.

Não invente informações comerciais que não
tenham sido fornecidas no briefing.

### STATUS
Novo projeto de produção
`;

    const nomeProjeto =
      (produto || tema || tipo || "Novo projeto").trim();

    const titulo =
      `Projeto Karina Studio — ${nomeProjeto}`;

    const resposta = await fetch(
      "https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/issues",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: titulo,
          body: corpoIssue
        })
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro GitHub:", resultado);

      return {
        statusCode: resposta.status,
        headers: corsHeaders,
        body: JSON.stringify({
          sucesso: false,
          erro: "Não foi possível criar o projeto no GitHub."
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        sucesso: true,
        mensagem: "Projeto enviado para produção!",
        numero: resultado.number
      })
    };

  } catch (erro) {
    console.error("Erro:", erro);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        sucesso: false,
        erro: "Erro interno ao processar o projeto."
      })
    };
  }
};
