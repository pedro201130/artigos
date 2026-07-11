/* ============================================================
   PH — aplicação de página única (sem dependências)
   Roteamento por hash + leitor de Markdown renderizado no
   cliente. Fonte única de verdade: os arquivos em articles/.
   ============================================================ */

'use strict';

/* ---- Manifesto de artigos (espelha o índice do README) ---- */
const ARTICLES = [
  {
    num: '01',
    slug: 'principios-percepcao-visual',
    file: 'articles/principios-percepcao-visual.md',
    title: 'Princípios de Percepção Visual no Design de Interfaces',
    tema: 'Revisão integrada',
    status: 'Publicado',
    desc: 'Revisão integrada dos principais princípios de percepção aplicados a interfaces, da Gestalt à carga cognitiva.'
  },
  {
    num: '02',
    slug: 'contraste-e-acessibilidade',
    file: 'articles/contraste-e-acessibilidade.md',
    title: 'Contraste e Acessibilidade: Percepção, Medição e os Limites da Convenção',
    tema: 'Contraste',
    status: 'Publicado',
    desc: 'Por que o contraste funciona, o que as WCAG realmente medem e onde a métrica falha. Evidência psicofísica versus convenção estética.'
  },
  {
    num: '03',
    slug: 'hierarquia-visual-eye-tracking',
    file: 'articles/hierarquia-visual-eye-tracking.md',
    title: 'Hierarquia visual medida com eye-tracking',
    tema: 'Hierarquia',
    status: 'Planejado',
    desc: 'Como saliência e ordem de leitura podem ser medidas empiricamente, e o que os mapas de calor de fato mostram.'
  },
  {
    num: '04',
    slug: 'gestalt-aplicada',
    file: 'articles/gestalt-aplicada.md',
    title: 'A Gestalt aplicada: proximidade, alinhamento e continuidade',
    tema: 'Agrupamento',
    status: 'Planejado',
    desc: 'As leis de agrupamento como ferramentas de composição, com atenção ao que sobrevive ao escrutínio experimental.'
  },
  {
    num: '05',
    slug: 'mito-proporcao-aurea',
    file: 'articles/mito-proporcao-aurea.md',
    title: 'O mito da proporção áurea na estética',
    tema: 'Proporção áurea',
    status: 'Planejado',
    desc: 'Um exame cético de uma das alegações estéticas mais populares e menos sustentadas por evidência.'
  }
];

const bySlug = Object.fromEntries(ARTICLES.map(a => [a.slug, a]));

/* ============================================================
   Renderizador de Markdown mínimo (subconjunto GFM)
   Suporta: headings, parágrafos, hr, blockquote, listas
   ordenadas/não ordenadas, tabelas, código em bloco e inline,
   negrito, itálico e links.
   ============================================================ */
const MD = (() => {
  const esc = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Sentinela ASCII improvável em prosa, usado para proteger
  // trechos de código inline durante as substituições seguintes.
  const OPEN = '@@C', CLOSE = 'C@@';

  function inline(text) {
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => {
      codes.push('<code>' + esc(c) + '</code>');
      return OPEN + (codes.length - 1) + CLOSE;
    });

    text = esc(text);

    // Links [texto](url)
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const safe = /^(https?:|mailto:|#|\.|\/|articles\/)/i.test(url) ? url : '#';
      return '<a href="' + safe + '">' + label + '</a>';
    });

    // Negrito e itálico
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

    // Restaura o código inline protegido
    text = text.replace(/@@C(\d+)C@@/g, (_, i) => codes[+i]);
    return text;
  }

  function tableRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  }

  return function render(src) {
    const lines = src.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
      let line = lines[i];

      // Linhas em branco
      if (/^\s*$/.test(line)) { i++; continue; }

      // Código em bloco cercado
      if (/^```/.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // fecha ```
        out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // Régua horizontal
      if (/^\s*---+\s*$/.test(line)) { out.push('<hr />'); i++; continue; }

      // Cabeçalhos
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { const lvl = h[1].length; out.push('<h' + lvl + '>' + inline(h[2].trim()) + '</h' + lvl + '>'); i++; continue; }

      // Citação (blockquote), podendo abranger várias linhas
      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>');
        continue;
      }

      // Tabela (linha com | seguida de separador ---)
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:-]*-[-\s:|]*$/.test(lines[i + 1])) {
        const header = tableRow(line);
        i += 2; // pula cabeçalho e separador
        const rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])) {
          rows.push(tableRow(lines[i])); i++;
        }
        let t = '<div class="table-scroll"><table><thead><tr>';
        t += header.map(c => '<th>' + inline(c) + '</th>').join('');
        t += '</tr></thead><tbody>';
        for (const r of rows) {
          t += '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>';
        }
        t += '</tbody></table></div>';
        out.push(t);
        continue;
      }

      // Lista ordenada
      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++;
        }
        out.push('<ol>' + items.map(t => '<li>' + inline(t) + '</li>').join('') + '</ol>');
        continue;
      }

      // Lista não ordenada
      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++;
        }
        out.push('<ul>' + items.map(t => '<li>' + inline(t) + '</li>').join('') + '</ul>');
        continue;
      }

      // Parágrafo (acumula linhas até uma quebra em branco)
      const para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^(#{1,4}\s|>|```|\s*---+\s*$|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i]) &&
             !(/\|/.test(lines[i]) && i + 1 < lines.length && /^\s*\|?[\s:-]*-[-\s:|]*$/.test(lines[i + 1]))) {
        para.push(lines[i]); i++;
      }
      if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
    }

    return out.join('\n');
  };
})();

/* ============================================================
   Renderização das views
   ============================================================ */
const views = {
  home: document.getElementById('view-home'),
  article: document.getElementById('view-article')
};

function showView(name) {
  for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
}

function renderGrid(filter = 'all') {
  const grid = document.getElementById('grid');
  const list = filter === 'all' ? ARTICLES : ARTICLES.filter(a => a.status === filter);
  grid.innerHTML = list.map(a => {
    const locked = a.status !== 'Publicado';
    const titleInner = locked
      ? '<span>' + a.title + '</span>'
      : '<a href="#/artigo/' + a.slug + '">' + a.title + '</a>';
    return (
      '<li class="card' + (locked ? ' is-locked' : '') + '">' +
        '<div class="card__top">' +
          '<span class="card__num">' + a.num + '</span>' +
          '<span class="badge badge--' + a.status + '">' + a.status + '</span>' +
        '</div>' +
        '<h2 class="card__title">' + titleInner + '</h2>' +
        '<p class="card__desc">' + a.desc + '</p>' +
        '<div class="card__meta"><span class="card__tag">' + a.tema + '</span></div>' +
      '</li>'
    );
  }).join('');
}

function initFilters() {
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      renderGrid(chip.dataset.filter);
    });
  });
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

let tocObserver = null;

// Monta o sumário (TOC) a partir dos H2/H3 do artigo já renderizado.
function buildTOC(articleEl, tocEl) {
  if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }

  const heads = Array.from(articleEl.querySelectorAll('h2, h3'));
  if (heads.length < 2) { tocEl.hidden = true; tocEl.innerHTML = ''; return; }

  const used = new Set();
  let items = '';
  heads.forEach(h => {
    let id = slugify(h.textContent) || 'sec';
    let unique = id, n = 2;
    while (used.has(unique)) unique = id + '-' + (n++);
    used.add(unique);
    h.id = unique;
    const cls = h.tagName === 'H3' ? 'toc--h3' : 'toc--h2';
    items += '<li><a class="' + cls + '" href="#' + unique + '" data-target="' + unique + '">' + h.textContent + '</a></li>';
  });
  tocEl.innerHTML = '<p class="toc__title">Neste artigo</p><ol>' + items + '</ol>';
  tocEl.hidden = false;

  setupScrollSpy(heads, tocEl);
}

// Cliques no TOC rolam até a seção sem acionar o roteador por hash.
function initTOCNav() {
  const tocEl = document.getElementById('toc');
  if (!tocEl) return;
  tocEl.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-target]');
    if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.dataset.target);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Move o foco para acessibilidade, sem alterar a rota (#/artigo/...).
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}

// Realça no TOC a seção visível no momento (scroll-spy).
function setupScrollSpy(heads, tocEl) {
  if (typeof IntersectionObserver === 'undefined') return;
  const links = new Map(
    Array.from(tocEl.querySelectorAll('a')).map(a => [a.dataset.target, a])
  );
  const visible = new Set();

  const setActive = (id) => {
    links.forEach(a => a.classList.remove('is-active'));
    const a = links.get(id);
    if (a) a.classList.add('is-active');
  };

  tocObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) visible.add(e.target.id);
      else visible.delete(e.target.id);
    });
    // A seção ativa é a primeira (mais acima) atualmente visível.
    const firstVisible = heads.find(h => visible.has(h.id));
    if (firstVisible) setActive(firstVisible.id);
  }, { rootMargin: '-84px 0px -70% 0px', threshold: 0 });

  heads.forEach(h => tocObserver.observe(h));
  setActive(heads[0].id);
}

function mountArticle(md, meta, articleEl, statusEl, tocEl) {
  articleEl.innerHTML = MD(md);
  buildTOC(articleEl, tocEl);
  statusEl.hidden = true;
  statusEl.classList.remove('is-loading');
  document.title = meta.title + ' — PH';
  document.getElementById('conteudo').focus();
}

async function renderArticle(slug) {
  const meta = bySlug[slug];
  const statusEl = document.getElementById('article-status');
  const articleEl = document.getElementById('article');
  const tocEl = document.getElementById('toc');
  const crumb = document.getElementById('crumb-title');

  articleEl.innerHTML = '';
  tocEl.hidden = true;
  statusEl.hidden = true;

  if (!meta) {
    crumb.textContent = 'Não encontrado';
    statusEl.hidden = false;
    statusEl.innerHTML = 'Artigo não encontrado. <a href="#/">Voltar para a lista</a>.';
    return;
  }

  crumb.textContent = meta.tema;

  // 1) Conteúdo embutido (funciona ao abrir por file:// sem servidor).
  const embedded = (window.ARTICLE_CONTENT || {})[slug];
  if (typeof embedded === 'string') {
    mountArticle(embedded, meta, articleEl, statusEl, tocEl);
    return;
  }

  // 2) Fallback: busca o .md por HTTP (GitHub Pages ou servidor local).
  statusEl.hidden = false;
  statusEl.textContent = 'Carregando artigo…';
  statusEl.classList.add('is-loading');

  try {
    const res = await fetch(meta.file, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const md = await res.text();
    mountArticle(md, meta, articleEl, statusEl, tocEl);
  } catch (err) {
    statusEl.classList.remove('is-loading');
    statusEl.innerHTML =
      'Não foi possível carregar <code>' + meta.file + '</code>. ' +
      'Se você abriu o arquivo diretamente pelo navegador (<code>file://</code>), ' +
      'o carregamento de arquivos locais é bloqueado. Sirva a pasta por HTTP, por exemplo ' +
      'com <code>python -m http.server</code>, ou publique no GitHub Pages.';
  }
}

/* ============================================================
   Roteador (hash)
   ============================================================ */
function router() {
  const hash = location.hash || '#/';

  // Âncoras internas (#secao) não são rotas: deixa o navegador rolar
  // e mantém a view atual, sem voltar para a lista.
  if (hash !== '#/' && !hash.startsWith('#/')) return;

  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  window.scrollTo({ top: 0, behavior: 'auto' });

  if (parts[0] === 'artigo' && parts[1]) {
    showView('article');
    renderArticle(parts[1]);
  } else {
    showView('home');
    document.title = 'PH — Artigos sobre Design Visual';
  }
}

/* ---- Bootstrap ---- */
renderGrid();
initFilters();
initTOCNav();
window.addEventListener('hashchange', router);
router();
