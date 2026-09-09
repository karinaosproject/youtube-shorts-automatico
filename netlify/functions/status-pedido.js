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

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };


    // ========================================
    // 1. CONSULTAR A ISSUE
    // ========================================

    const issueResposta = await fetch(
      `https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/issues/${numero}`,
      {
        method: "GET",
        headers
      }
    );

    const resultado = await issueResposta.json();

    if (!issueResposta.ok) {

      console.error(
        "Erro GitHub Issue:",
        resultado
      );

      return {
        statusCode: issueResposta.status,
        body: JSON.stringify({
          sucesso: false,
          erro: "Não foi possível consultar o pedido."
        })
      };

    }


    const corpo = (
      resultado.body || ""
    ).toUpperCase();


    // ========================================
    // 2. SE JÁ FOI PUBLICADO
    // ========================================

    if (
      corpo.includes("YOUTUBE VIDEO ID") ||
      corpo.includes("STATUS: PUBLICADO") ||
      corpo.includes("PUBLICADO COM SUCESSO")
    ) {

      return {
        statusCode: 200,

        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: "concluido",
          fechado: resultado.state === "closed"
        })

      };

    }


    // ========================================
    // 3. VERIFICAR ERRO REGISTRADO NA ISSUE
    // ========================================

    if (
      corpo.includes("ERRO") ||
      corpo.includes("FALHA")
    ) {

      return {
        statusCode: 200,

        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: "erro",
          fechado: resultado.state === "closed"
        })

      };

    }


    // ========================================
    // 4. CONSULTAR WORKFLOWS
    // ========================================

    const workflowsResposta = await fetch(
      `https://api.github.com/repos/karinaosproject/youtube-shorts-automatico/actions/runs?event=issues&per_page=20`,
      {
        method: "GET",
        headers
      }
    );

    const workflows = await workflowsResposta.json();


    if (!workflowsResposta.ok) {

      console.error(
        "Erro ao consultar workflows:",
        workflows
      );

      // Se não conseguir consultar os workflows,
      // mantém o comportamento antigo.

      let statusFallback = "recebido";

      if (
        corpo.includes("PUBLICANDO") ||
        corpo.includes("YOUTUBE")
      ) {
        statusFallback = "publicando";
      }
      else if (
        corpo.includes("MONTANDO") ||
        corpo.includes("VÍDEO") ||
        corpo.includes("VIDEO")
      ) {
        statusFallback = "montando";
      }
      else if (
        corpo.includes("VOZ") ||
        corpo.includes("PIPER")
      ) {
        statusFallback = "voz";
      }
      else if (
        corpo.includes("ROTEIRO") ||
        corpo.includes("GEMINI")
      ) {
        statusFallback = "roteiro";
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: statusFallback,
          fechado: resultado.state === "closed"
        })
      };

    }


    // ========================================
    // 5. PROCURAR EXECUÇÃO DO PEDIDO
    // ========================================

    const listaRuns = Array.isArray(
      workflows.workflow_runs
    )
      ? workflows.workflow_runs
      : [];


    const runDoPedido = listaRuns.find(
      function(run) {

        const texto = (
          (run.display_title || "") +
          " " +
          (run.name || "")
        ).toLowerCase();

        return (
          texto.includes(`#${numero}`) ||
          texto.includes(`pedido ${numero}`)
        );

      }
    );


    // ========================================
    // 6. SE NÃO ENCONTROU WORKFLOW
    // ========================================

    if (!runDoPedido) {

      return {
        statusCode: 200,

        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: "recebido",
          fechado: resultado.state === "closed"
        })

      };

    }


    // ========================================
    // 7. ANALISAR EXECUÇÃO
    // ========================================

    const nomeWorkflow = (
      runDoPedido.name || ""
    ).toLowerCase();

    const statusWorkflow = (
      runDoPedido.status || ""
    ).toLowerCase();

    const conclusao = (
      runDoPedido.conclusion || ""
    ).toLowerCase();


    // ========================================
    // 8. ERRO NO WORKFLOW
    // ========================================

    if (
      conclusao === "failure" ||
      conclusao === "cancelled"
    ) {

      return {
        statusCode: 200,

        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: "erro",
          fechado: resultado.state === "closed"
        })

      };

    }


    // ========================================
    // 9. WORKFLOW DE PUBLICAÇÃO
    // ========================================

    if (
      nomeWorkflow.includes("publicar")
    ) {

      if (
        statusWorkflow === "completed" &&
        conclusao === "success"
      ) {

        return {
          statusCode: 200,

          body: JSON.stringify({
            sucesso: true,
            numero: resultado.number,
            titulo: resultado.title,
            status: "concluido",
            fechado: resultado.state === "closed"
          })

        };

      }


      return {
        statusCode: 200,

        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: "publicando",
          fechado: resultado.state === "closed"
        })

      };

    }


    // ========================================
    // 10. WORKFLOW DE PROCESSAMENTO
    // ========================================

    if (
      nomeWorkflow.includes("processar")
    ) {

      if (
        statusWorkflow === "completed" &&
        conclusao === "success"
      ) {

        return {
          statusCode: 200,

          body: JSON.stringify({
            sucesso: true,
            numero: resultado.number,
            titulo: resultado.title,
            status: "publicando",
            fechado: resultado.state === "closed"
          })

        };

      }


      // Enquanto estiver rodando,
      // usamos o progresso aproximado
      // baseado no texto da Issue.

      if (
        corpo.includes("MONTANDO")
      ) {

        return {
          statusCode: 200,

          body: JSON.stringify({
            sucesso: true,
            numero: resultado.number,
            titulo: resultado.title,
            status: "montando",
            fechado: resultado.state === "closed"
          })

        };

      }


      if (
        corpo.includes("VOZ") ||
        corpo.includes("PIPER")
      ) {

        return {
          statusCode: 200,

          body: JSON.stringify({
            sucesso: true,
            numero: resultado.number,
            titulo: resultado.title,
            status: "voz",
            fechado: resultado.state === "closed"
          })

        };

      }


      if (
        corpo.includes("ROTEIRO") ||
        corpo.includes("GEMINI")
      ) {

        return {
          statusCode: 200,

          body: JSON.stringify({
            sucesso: true,
            numero: resultado.number,
            titulo: resultado.title,
            status: "roteiro",
            fechado: resultado.state === "closed"
          })

        };

      }


      return {
        statusCode: 200,

        body: JSON.stringify({
          sucesso: true,
          numero: resultado.number,
          titulo: resultado.title,
          status: "recebido",
          fechado: resultado.state === "closed"
        })

      };

    }


    // ========================================
    // 11. FALLBACK
    // ========================================

    return {
      statusCode: 200,

      body: JSON.stringify({
        sucesso: true,
        numero: resultado.number,
        titulo: resultado.title,
        status: "recebido",
        fechado: resultado.state === "closed"
      })

    };


  } catch (erro) {

    console.error(
      "Erro interno:",
      erro
    );

    return {
      statusCode: 500,

      body: JSON.stringify({
        sucesso: false,
        erro: "Erro interno ao consultar o pedido."
      })

    };

  }

};