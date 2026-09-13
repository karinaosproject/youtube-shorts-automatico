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
      "https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/issues?state=all&sort=updated&direction=desc&per_page=50",
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
          erro: "Não foi possível listar os pedidos."
        })
      };
    }

    const pedidos = resultado
      .filter(function(item) {
        return !item.pull_request;
      })
      .map(function(item) {
        const corpo = item.body || "";
        const corpoMaiusculo = corpo.toUpperCase();

        let status = "recebido";

        if (
          corpoMaiusculo.includes("### PUBLICAÇÃO NO YOUTUBE") &&
          corpoMaiusculo.includes("STATUS: PUBLICADO")
        ) {
          status = "concluido";
        }
        else if (
          corpoMaiusculo.includes("ERRO") ||
          corpoMaiusculo.includes("FALHA")
        ) {
          status = "erro";
        }
        else if (
          corpoMaiusculo.includes("PUBLICANDO") ||
          corpoMaiusculo.includes("YOUTUBE")
        ) {
          status = "publicando";
        }
        else if (
          corpoMaiusculo.includes("MONTANDO") ||
          corpoMaiusculo.includes("VÍDEO") ||
          corpoMaiusculo.includes("VIDEO")
        ) {
          status = "montando";
        }
        else if (
          corpoMaiusculo.includes("VOZ") ||
          corpoMaiusculo.includes("PIPER")
        ) {
          status = "voz";
        }
        else if (
          corpoMaiusculo.includes("ROTEIRO") ||
          corpoMaiusculo.includes("GEMINI")
        ) {
          status = "roteiro";
        }

        let youtubeId = null;
        let youtubeUrl = null;

        const idMatch = corpo.match(
          /### YOUTUBE VIDEO ID\s*\n([^\s]+)/i
        );

        if (idMatch) {
          youtubeId = idMatch[1].trim();
        }

        const urlMatch = corpo.match(
          /### YOUTUBE URL\s*\n([^\s]+)/i
        );

        if (urlMatch) {
          youtubeUrl = urlMatch[1].trim();
        }

        if (!youtubeId && youtubeUrl) {
          const idUrlMatch = youtubeUrl.match(
            /[?&]v=([^&\s]+)/i
          );

          const idShortsMatch = youtubeUrl.match(
            /\/shorts\/([^?&\s/]+)/i
          );

          const idEmbedMatch = youtubeUrl.match(
            /\/embed\/([^?&\s/]+)/i
          );

          youtubeId =
            (idUrlMatch && idUrlMatch[1]) ||
            (idShortsMatch && idShortsMatch[1]) ||
            (idEmbedMatch && idEmbedMatch[1]) ||
            null;
        }

        if (!youtubeUrl && youtubeId) {
          youtubeUrl =
            `https://www.youtube.com/watch?v=${youtubeId}`;
        }

        let youtubeThumbnailUrl = null;

        if (youtubeId) {
          youtubeThumbnailUrl =
            `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
        }

        return {
          numero: item.number,
          titulo: item.title,
          status: status,
          estado: item.state,
          criadoEm: item.created_at,
          atualizadoEm: item.updated_at,
          url: item.html_url,
          youtubeId: youtubeId,
          youtubeUrl: youtubeUrl,
          youtubeThumbnailUrl: youtubeThumbnailUrl
        };
      });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        sucesso: true,
        pedidos: pedidos
      })
    };

  } catch (erro) {
    console.error("Erro interno:", erro);
    return {
      statusCode: 500,
      body: JSON.stringify({
        sucesso: false,
        erro: "Erro interno ao listar os pedidos."
      })
    };
  }
};
