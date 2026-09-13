exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: JSON.stringify({ sucesso: false, erro: "Método não permitido." }) };
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return { statusCode: 500, body: JSON.stringify({ sucesso: false, erro: "GITHUB_TOKEN não configurado no Netlify." }) };
    const resposta = await fetch("https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/issues?state=all&sort=updated&direction=desc&per_page=50", { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    const resultado = await resposta.json();
    if (!resposta.ok) return { statusCode: resposta.status, body: JSON.stringify({ sucesso: false, erro: "Não foi possível listar os pedidos." }) };
    const pedidos = resultado.filter(i => !i.pull_request).map(i => {
      const corpo = i.body || ""; const up = corpo.toUpperCase();
      let status = "recebido";
      if (up.includes("### PUBLICAÇÃO NO YOUTUBE") && up.includes("STATUS: PUBLICADO")) status = "concluido";
      else if (up.includes("ERRO") || up.includes("FALHA")) status = "erro";
      else if (up.includes("PUBLICANDO") || up.includes("YOUTUBE")) status = "publicando";
      else if (up.includes("MONTANDO") || up.includes("VÍDEO") || up.includes("VIDEO")) status = "montando";
      else if (up.includes("VOZ") || up.includes("PIPER")) status = "voz";
      else if (up.includes("ROTEIRO") || up.includes("GEMINI")) status = "roteiro";
      const u = corpo.match(/### YOUTUBE URL\s*\n([^\s]+)/i)?.[1]?.trim() || null;
      let id = corpo.match(/### YOUTUBE VIDEO ID\s*\n([^\s]+)/i)?.[1]?.trim() || null;
      if (!id && u) id = u.match(/[?&]v=([^&\s]+)/i)?.[1] || u.match(/\/shorts\/([^?&\s/]+)/i)?.[1] || u.match(/\/embed\/([^?&\s/]+)/i)?.[1] || null;
      const url = u || (id ? `https://www.youtube.com/watch?v=${id}` : null);
      return { numero: i.number, titulo: i.title, status, estado: i.state, criadoEm: i.created_at, atualizadoEm: i.updated_at, url: i.html_url, youtubeId: id, youtubeUrl: url, youtubeThumbnailUrl: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null };
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ sucesso: true, pedidos }) };
  } catch (erro) { console.error("Erro interno:", erro); return { statusCode: 500, body: JSON.stringify({ sucesso: false, erro: "Erro interno ao listar os pedidos." }) }; }
};
