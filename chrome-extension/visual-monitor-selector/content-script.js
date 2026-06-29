(() => {
  if (window.__visualMonitorSelectorLoaded) {
    window.dispatchEvent(new CustomEvent('visual-monitor-selector-show-panel'));
    return;
  }
  window.__visualMonitorSelectorLoaded = true;

  const STORE_KEY = 'visualMonitorLastSelection';
  const RESULT_KEY = 'visualMonitorLastSelectionResult';
  const CHANGE_EVENTS_KEY = 'visualMonitorChangeEvents';
  const CHANGE_MONITOR_PATHS = ['/admin/change-monitor', '/monitor/watch-monitor'];
  const isChangeMonitorPage = CHANGE_MONITOR_PATHS.some((path) => location.pathname.includes(path));

  const safeCss = (value) => {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const cssPath = (element) => {
    if (!element || element.nodeType !== 1) return '';
    if (element === document.documentElement) return 'html';
    if (element === document.body) return 'body';
    if (element.id) return `#${safeCss(element.id)}`;

    const parts = [];
    let current = element;

    while (current && current.nodeType === 1 && current !== document.body) {
      let part = current.tagName.toLowerCase();
      const classes = Array.from(current.classList || [])
        .filter((item) => item && !/^[0-9]+$/.test(item))
        .slice(0, 3);

      if (classes.length) {
        part += `.${classes.map((item) => safeCss(item)).join('.')}`;
      } else if (current.parentElement) {
        const same = Array.from(current.parentElement.children).filter((item) => item.tagName === current.tagName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(current) + 1})`;
      }

      parts.unshift(part);
      current = current.parentElement;
      if (parts.length >= 7) break;
    }

    return parts.join(' > ') || 'body';
  };

  const isUsefulElement = (element) => {
    if (!element || element === document.documentElement) return false;
    if (element === document.body) return true;
    const rect = element.getBoundingClientRect();
    const text = (element.innerText || element.textContent || '').trim();
    if (rect.width < 20 || rect.height < 12) return false;
    if (!text && !element.querySelector('a[href], img')) return false;
    return true;
  };

  const pickTarget = (target, exact = false) => {
    if (exact && isUsefulElement(target)) return target;

    const selectors = [
      'a[href]',
      'article',
      'li',
      "[role='article']",
      "[class*='news' i]",
      "[class*='xeber' i]",
      "[class*='post' i]",
      "[class*='article' i]",
      "[class*='item' i]",
      "[class*='card' i]",
      "[class*='list' i]",
      "[class*='content' i]",
      'section',
      'ul',
      'ol',
      'main',
      'table',
      'div',
    ];

    for (const selector of selectors) {
      const candidate = target.closest(selector);
      if (isUsefulElement(candidate)) return candidate;
    }

    return target === document.documentElement ? document.body : target;
  };

  const publishToChangeMonitorPage = (payload) => {
    window.postMessage({ type: 'visual-monitor-extension-selector', payload }, '*');
  };

  if (isChangeMonitorPage) {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'visual-monitor-extension-save-result') {
        chrome.storage.local.set({ [RESULT_KEY]: event.data.payload || {} });
        return;
      }
      if (event.data?.type === 'visual-monitor-extension-change-events') {
        chrome.storage.local.set({ [CHANGE_EVENTS_KEY]: event.data.payload || { items: [] } });
      }
    });

    chrome.storage.local.get(STORE_KEY, (result) => {
      if (result && result[STORE_KEY]) publishToChangeMonitorPage(result[STORE_KEY]);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORE_KEY]?.newValue) return;
      publishToChangeMonitorPage(changes[STORE_KEY].newValue);
    });
    return;
  }

  let active = false;
  let overlay = null;
  let panel = null;
  let pendingSelection = null;
  let lastSavedSelection = null;

  const ensureOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'z-index:2147483646',
      'pointer-events:none',
      'border:3px solid #22c55e',
      'background:rgba(34,197,94,.14)',
      'box-shadow:0 0 0 99999px rgba(15,23,42,.08)',
      'display:none',
      'border-radius:4px',
    ].join(';');
    document.documentElement.appendChild(overlay);
    return overlay;
  };

  const showOverlay = (event) => {
    if (!active) return;
    const target = pickTarget(event.target, true);
    const rect = target.getBoundingClientRect();
    const box = ensureOverlay();
    box.style.display = 'block';
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  };

  const hideOverlay = () => {
    if (overlay) overlay.style.display = 'none';
  };

  const notify = (text) => {
    const item = document.createElement('div');
    item.textContent = text;
    item.style.cssText = 'position:fixed;right:18px;bottom:88px;z-index:2147483647;background:#0f172a;color:white;padding:10px 12px;border-radius:8px;font:14px Arial,sans-serif;box-shadow:0 10px 30px rgba(15,23,42,.25)';
    document.documentElement.appendChild(item);
    setTimeout(() => item.remove(), 2200);
  };

  const hidePanel = () => {
    active = false;
    hideOverlay();
    if (panel) panel.style.display = 'none';
    renderPanelState();
  };

  const showPanel = () => {
    injectPanel();
    if (panel) panel.style.display = 'grid';
    setActive(true);
  };

  const renderPanelState = () => {
    if (!panel) return;
    const status = panel.querySelector('[data-vm-status]');
    const toggle = panel.querySelector('[data-vm-toggle]');
    const preview = panel.querySelector('[data-vm-preview]');
    const actions = panel.querySelector('[data-vm-actions]');

    status.textContent = active ? 'Seçim aktivdir' : pendingSelection ? 'Seçim hazırdır' : 'Gəzinti rejimi';
    toggle.textContent = active ? 'Gəzintiyə qayıt' : 'Selector seç';

    if (pendingSelection) {
      preview.innerHTML = `
        <div style="font-size:12px;opacity:.82;margin-top:4px">Seçilən hissə</div>
        <div style="max-height:74px;overflow:auto;background:#1e293b;border-radius:8px;padding:8px;font-size:12px;line-height:1.35">${escapeHtml(pendingSelection.text || pendingSelection.href || 'Mətn tapılmadı')}</div>
        <div style="word-break:break-all;font-size:11px;opacity:.86">Selector: ${escapeHtml(pendingSelection.selector)}</div>
      `;
      actions.style.display = 'grid';
    } else {
      preview.innerHTML = '';
      actions.style.display = 'none';
    }
  };

  const setActive = (next) => {
    active = next;
    if (!active) hideOverlay();
    renderPanelState();
  };

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const captureSelection = (event) => {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();

    const target = pickTarget(event.target, true);
    const link = target.closest('a[href]');
    const selected = {
      selector: cssPath(target) || 'body',
      text: (target.innerText || target.textContent || '').trim().slice(0, 500),
      href: link ? link.href : null,
      tag: target.tagName ? target.tagName.toLowerCase() : 'body',
      pageUrl: location.href,
      pageTitle: document.title || '',
      selectedAt: new Date().toISOString(),
    };

    pendingSelection = selected;
    hidePanel();
    commitSelection(selected);
  };

  const commitSelection = (selection = pendingSelection) => {
    if (!selection) {
      notify('Əvvəl izlənəcək hissəni seç.');
      return;
    }

    lastSavedSelection = { ...selection };
    chrome.storage.local.set({ [STORE_KEY]: lastSavedSelection }, () => {
      try {
        navigator.clipboard?.writeText(lastSavedSelection.selector).catch(() => {});
      } catch (_) {}
      if (pendingSelection?.selectedAt === selection.selectedAt) pendingSelection = null;
      renderPanelState();
      notify('Selector göndərildi. Gəzinti rejimi aktivdir.');
    });
  };

  const injectPanel = () => {
    if (panel || document.getElementById('visual-monitor-selector-panel')) return;
    panel = document.createElement('div');
    panel.id = 'visual-monitor-selector-panel';
    panel.innerHTML = `
      <div style="font-weight:700">Visual Monitor</div>
      <div data-vm-status style="font-size:12px;opacity:.82">Gəzinti rejimi</div>
      <button data-vm-toggle type="button">Selector seç</button>
      <div data-vm-preview style="display:grid;gap:6px"></div>
      <div data-vm-actions style="display:none;grid-template-columns:1fr 1fr;gap:8px">
        <button data-vm-save type="button">Yadda saxla</button>
        <button data-vm-retry type="button">Yenidən seç</button>
      </div>
    `;
    panel.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:2147483647',
      'background:#0f172a',
      'color:white',
      'font:14px Arial,sans-serif',
      'padding:12px',
      'border-radius:12px',
      'box-shadow:0 12px 40px rgba(15,23,42,.35)',
      'display:none',
      'gap:8px',
      'width:260px',
      'max-width:calc(100vw - 36px)',
    ].join(';');

    const styleButton = (button, background, color) => {
      button.style.cssText = `border:0;border-radius:8px;background:${background};color:${color};font-weight:700;padding:8px 10px;cursor:pointer`;
    };

    const toggle = panel.querySelector('[data-vm-toggle]');
    const save = panel.querySelector('[data-vm-save]');
    const retry = panel.querySelector('[data-vm-retry]');
    styleButton(toggle, '#34d399', '#052e16');
    styleButton(save, '#2563eb', '#ffffff');
    styleButton(retry, '#334155', '#ffffff');

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setActive(!active);
    });
    retry.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      pendingSelection = null;
      setActive(true);
      renderPanelState();
    });

    document.documentElement.appendChild(panel);
    renderPanelState();
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[RESULT_KEY]?.newValue) return;
    const result = changes[RESULT_KEY].newValue;
    if (!lastSavedSelection || result.selectedAt !== lastSavedSelection.selectedAt) return;
    notify(result.message || (result.status === 'exists' ? 'Bu hissə artıq bazada var.' : 'İzləmə cavabı gəldi.'));
  });

  window.addEventListener('visual-monitor-selector-show-panel', () => {
    showPanel();
  });
  document.addEventListener('mouseover', showOverlay, true);
  document.addEventListener('mouseout', hideOverlay, true);
  document.addEventListener('click', captureSelection, true);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hidePanel();
  });
})();
