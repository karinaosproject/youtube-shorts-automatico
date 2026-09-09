exports.handler = async (event) => {

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        sucesso: false,
        erro: "Método não permitido."
      })
    };
  }

  try {

    const numero = event.queryStringParameters?.numero;

    if (!numero) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          sucesso: false,
          erro: "Número do pedido não informado."
        })
      };
    }

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          sucesso: false,
          erro: "GITHUB_TOKEN não configurado no Netlify."
        })
      };
    }

    const resposta = await fetch(
      `https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/issues/${numero}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      }
    );

    const resultado = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro GitHub:", resultado);

      return {
        statusCode: resposta.status,
        body: JSON.stringify({
          sucesso: false,
          erro: "Não foi possível consultar o pedido."
        })
      };
    }

    const corpo = resultado.body || "";

    let status = "recebido";

    if (
      corpo.includes("PUBLICADO") ||
      corpo.includes("CONCLUÍDO") ||
      corpo.includes("CONCLUIDO")
    ) {
      status = "concluido";
    }
    else if (
      corpo.includes("ERRO") ||
      corpo.includes("FALHA")
    ) {
      status = "erro";
    }
    else if (
      corpo.includes("PUBLICANDO") ||
      corpo.includes("YOUTUBE")
    ) {
      status = "publicando";
    }
    else if (
      corpo.includes("MONTANDO") ||
      corpo.includes("VÍDEO") ||
      corpo.includes("VIDEO")
    ) {
      status = "montando";
    }
    else if (
      corpo.includes("VOZ") ||
      corpo.includes("PIPER")
    ) {
      status = "voz";
    }
    else if (
      corpo.includes("ROTEIRO") ||
      corpo.includes("GEMINI")
    ) {
      status = "roteiro";
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sucesso: true,
        numero: resultado.number,
        titulo: resultado.title,
        status: status,
        fechado: resultado.state === "closed"
      })
    };

  } catch (erro) {

    console.error("Erro interno:", erro);

    return {
      statusCode: 500,
      body: JSON.stringify({
        sucesso: false,
        erro: "Erro interno ao consultar o pedido."
      })
    };

  }

};