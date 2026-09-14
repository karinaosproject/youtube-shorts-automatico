/* Karina Studio — GitHub Pages → Google Apps Script bridge */
(function () {
  'use strict';

  const API_BASE = 'https://script.google.com/macros/s/AKfycbwfa4nw5Vr1R3YKhlTDIDt1XcLyX8Y1pvXdGpUiyziLwmGA_guclo9NYaIChj98-li2/exec';
  const originalFetch = window.fetch.bind(window);
  let sequence = 0;

  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      const callbackName = 'karinaStudioJsonp_' + Date.now() + '_' + (++sequence);
      const script = document.createElement('script');
      let finished = false;

      function cleanup() {
        if (finished) return;
        finished = true;
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve({
          ok: !!(data && data.sucesso !== false),
          status: data && data.sucesso === false ? 400 : 200,
          json: function () { return Promise.resolve(data); },
          text: function () { return Promise.resolve(JSON.stringify(data)); }
        });
      };

      script.onerror = function () {
        cleanup();
        reject(new Error('Não foi possível acessar o Apps Script.'));
      };

      script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + encodeURIComponent(callbackName);
      document.head.appendChild(script);
    });
  }

  window.fetch = function (input, init) {
    const requestUrl = typeof input === 'string' ? input : (input && input.url) || '';

    if (!requestUrl.includes('/.netlify/functions/')) {
      return originalFetch(input, init);
    }

    const url = new URL(requestUrl, window.location.href);
    const path = url.pathname;
    const target = new URL(API_BASE);

    if (path.endsWith('/listar-pedidos')) {
      target.searchParams.set('action', 'listar');
    }
    else if (path.endsWith('/status-pedido')) {
      target.searchParams.set('action', 'status');
      target.searchParams.set('numero', url.searchParams.get('numero') || '');
    }
    else if (path.endsWith('/criar-pedido')) {
      target.searchParams.set('action', 'criar');

      let body = init && init.body ? init.body : '';
      let dados = {};

      try {
        dados = typeof body === 'string' ? JSON.parse(body) : body || {};
      } catch (e) {
        return Promise.reject(new Error('Dados do pedido inválidos.'));
      }

      Object.keys(dados).forEach(function (key) {
        if (key === 'referencias') {
          target.searchParams.set(key, JSON.stringify(dados[key] || []));
        } else if (dados[key] !== undefined && dados[key] !== null) {
          target.searchParams.set(key, String(dados[key]));
        }
      });
    }
    else {
      return originalFetch(input, init);
    }

    return jsonp(target.toString());
  };
})();
