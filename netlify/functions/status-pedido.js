exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ sucesso:false, erro:"Método não permitido." }) };
  }

  try {
    const numero = event.queryStringParameters?.numero;

    if (!numero) {
      return { statusCode:400, headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sucesso:false, erro:"Número do projeto não informado." }) };
    }

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return { statusCode:500, headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sucesso:false, erro:"GITHUB_TOKEN não configurado no Netlify." }) };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    const resposta = await fetch(
      `https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/issues/${numero}`,
      { headers }
    );

    const issue = await resposta.json();

    if (!resposta.ok) {
      return { statusCode:resposta.status, headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sucesso:false, erro:"Não foi possível consultar o projeto." }) };
    }

    const corpo = issue.body || "";
    const up = corpo.toUpperCase();

    const downloadUrl = corpo.match(/### DOWNLOAD DO PROJETO\s*\n([^\s]+)/i)?.[1]?.trim() || null;
    const youtubeUrl = corpo.match(/### YOUTUBE URL\s*\n([^\s]+)/i)?.[1]?.trim() || null;

    if (up.includes("### ENTREGA KARINA STUDIO") && up.includes("STATUS:** CONCLUÍDO")) {
      return {
        statusCode:200,
        headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
        body:JSON.stringify({
          sucesso:true,
          numero:issue.number,
          titulo:issue.title,
          status:"concluido",
          downloadUrl,
          youtubeUrl,
          fechado:issue.state === "closed"
        })
      };
    }

    if (up.includes("ERRO") || up.includes("FALHA")) {
      return {
        statusCode:200,
        headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
        body:JSON.stringify({ sucesso:true, numero:issue.number, titulo:issue.title, status:"erro", downloadUrl, youtubeUrl, fechado:issue.state === "closed" })
      };
    }

    let status = "recebido";

    if (up.includes("MONTANDO") || up.includes("VÍDEO") || up.includes("VIDEO")) {
      status = "montando";
    } else if (up.includes("VOZ") || up.includes("PIPER")) {
      status = "voz";
    } else if (up.includes("ROTEIRO") || up.includes("GEMINI")) {
      status = "roteiro";
    }

    return {
      statusCode:200,
      headers:{"Content-Type":"application/json","Cache-Control":"no-store"},
      body:JSON.stringify({
        sucesso:true,
        numero:issue.number,
        titulo:issue.title,
        status,
        downloadUrl,
        youtubeUrl,
        fechado:issue.state === "closed"
      })
    };
  } catch (erro) {
    console.error("Erro interno:", erro);
    return { statusCode:500, headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sucesso:false, erro:"Erro interno ao consultar o projeto." }) };
  }
};