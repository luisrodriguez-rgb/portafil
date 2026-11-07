/**
 * Laboratorio interactivo y HUD en vivo de Compañeros (MySkin × Portafil) para el Estudio (play.html).
 * - Conecta el compañero pixel-art al tablero de juego: reacciona cuando la IA o el jugador devora commits,
 *   cuando se pausa la partida o cuando se completa el 100% de la matriz.
 * - Ofrece un explorador de las 53 skins (con filtro de las 15 originales y 7 categorías), vista previa del SVG,
 *   exportador en 3 formatos (Markdown, Web Component <portafil-companion> y GitHub Action) y prueba en vivo del widget flotante.
 */
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const PC = window.PortafilCompanion;
    if (!PC) return;

    // Elementos del HUD en el tablero
    const boardBar = document.getElementById('boardCompanionBar');
    const boardSprite = document.getElementById('boardCompSprite');
    const boardName = document.getElementById('boardCompName');
    const boardBadge = document.getElementById('boardCompBadge');
    const boardQuote = document.getElementById('boardCompQuote');
    const boardQuickSelect = document.getElementById('boardCompSelect');
    const openLabBtn = document.getElementById('openCompanionLabBtn');

    // Elementos del Laboratorio (#companionSection)
    const section = document.getElementById('companionSection');
    if (!section) return;

    const searchInput = document.getElementById('compSearchInput');
    const categoryPills = document.getElementById('compCategoryPills');
    const gridEl = document.getElementById('compGrid');
    const countLabel = document.getElementById('compCountLabel');
    const variantSelect = document.getElementById('compVariantSelect');
    const stateSelect = document.getElementById('compStateSelect');
    const themeSelect = document.getElementById('compThemeSelect');
    const sayInput = document.getElementById('compSayInput');
    const svgPreview = document.getElementById('compSvgPreview');
    const codeTabs = document.querySelectorAll('[data-comp-tab]');
    const codeOutput = document.getElementById('compCodeOutput');
    const copyCodeBtn = document.getElementById('compCopyCodeBtn');
    const downloadSvgBtn = document.getElementById('compDownloadSvgBtn');
    const toggleDockBtn = document.getElementById('compToggleDockBtn');

    // Entradas globales del estudio para sincronizar usuario, tema y estado de partida
    const studioUserInput = document.getElementById('usernameInput');
    const studioThemeSelect = document.getElementById('themeSelect');
    const progressPercentText = document.getElementById('progressPercentText');
    const playPauseBtn = document.getElementById('playPauseBtn');

    let selectedSkinId = 'capybara';
    let selectedCategory = 'all';
    let searchQuery = '';
    let activeCodeTab = 'markdown';
    let boardLiveState = 'FOCUS';
    let lastMilestone = 0;
    let floatingDockEl = null;

    const getLang = () => (window.I18n && window.I18n.lang === 'en' ? 'en' : 'es');
    const getActiveUser = () => {
      const raw = (studioUserInput && studioUserInput.value || 'torvalds').trim();
      const clean = raw.replace(/^https?:\/\/github\.com\//i, '').replace(/^@/, '').split('/')[0].trim();
      return clean || 'torvalds';
    };

    // Poblar selector rápido del tablero
    if (boardQuickSelect) {
      boardQuickSelect.innerHTML = PC.SKINS.map(s =>
        `<option value="${s.id}">${s.isOriginal ? '★ ' : ''}${s.name} (${s.category})</option>`
      ).join('');
      boardQuickSelect.value = selectedSkinId;
      boardQuickSelect.addEventListener('change', () => {
        selectSkin(boardQuickSelect.value);
      });
    }

    // Aplicar estilo de sprite animado con las coordenadas de fila/frames
    function applySpriteStyle(el, skinId, state, size = 56) {
      if (!el) return;
      const cfg = PC.getStateConfig(state);
      const rowY = -(cfg.row * size);
      const endX = -(cfg.frames * size);
      const duration = +(cfg.frames / cfg.fps).toFixed(2);
      const dataUrl = PC.getSpritesheetDataUrl(skinId);

      el.style.width = `${size * 6}px`;
      el.style.height = `${size * 6}px`;
      el.style.backgroundSize = `${size * 6}px ${size * 6}px`;
      if (dataUrl) {
        el.style.backgroundImage = `url("${dataUrl}")`;
      }
      el.style.setProperty('--comp-row-y', `${rowY}px`);
      el.style.setProperty('--comp-end-x', `${endX}px`);
      el.style.animation = `compSpriteStep ${duration}s steps(${cfg.frames}) infinite`;
    }

    function updateBoardHud() {
      if (!boardBar) return;
      const lang = getLang();
      const skin = PC.getSkin(selectedSkinId);
      const cfg = PC.getStateConfig(boardLiveState);
      const customSay = sayInput ? sayInput.value.trim() : '';
      const quote = PC.getDialogue(skin, boardLiveState, lang, customSay);

      if (boardName) {
        boardName.textContent = `${skin.isOriginal ? '★ ' : ''}${skin.name}`;
      }
      if (boardBadge) {
        boardBadge.textContent = `● ${lang === 'en' ? cfg.labelEn : cfg.labelEs}`;
      }
      if (boardQuote) {
        boardQuote.textContent = `“${quote}”`;
      }
      if (boardQuickSelect && boardQuickSelect.value !== selectedSkinId) {
        boardQuickSelect.value = selectedSkinId;
      }
      applySpriteStyle(boardSprite, selectedSkinId, boardLiveState, 56);
    }

    function renderCategoryPills() {
      if (!categoryPills) return;
      const lang = getLang();
      categoryPills.innerHTML = PC.CATEGORIES.map(cat => {
        const active = cat.id === selectedCategory;
        const label = lang === 'en' ? cat.labelEn : cat.labelEs;
        return `<button type="button" class="preset-pill${active ? ' active' : ''}" data-comp-cat="${cat.id}" aria-pressed="${active}">${label}</button>`;
      }).join('');

      categoryPills.querySelectorAll('[data-comp-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedCategory = btn.getAttribute('data-comp-cat') || 'all';
          renderCategoryPills();
          renderSkinGrid();
        });
      });
    }

    function renderSkinGrid() {
      if (!gridEl) return;
      const lang = getLang();
      const list = PC.filterSkins({ category: selectedCategory, query: searchQuery });
      if (countLabel) {
        countLabel.textContent = lang === 'en'
          ? `Showing ${list.length} of ${PC.SKINS.length} companions`
          : `Mostrando ${list.length} de ${PC.SKINS.length} compañeros`;
      }

      const previewState = (stateSelect && stateSelect.value !== 'auto') ? stateSelect.value : 'IDLE';
      gridEl.innerHTML = list.map(skin => {
        const isSelected = skin.id === selectedSkinId;
        const tag = skin.isOriginal
          ? `<span class="comp-origin-tag">${lang === 'en' ? '★ ORIGINAL' : '★ ORIGINAL'}</span>`
          : `<span class="comp-cat-tag">${skin.category}</span>`;
        return `
          <button type="button" class="comp-card${isSelected ? ' active' : ''}" data-skin-id="${skin.id}" aria-pressed="${isSelected}">
            <span class="comp-card-stage">
              <span class="comp-card-sprite" data-sprite-skin="${skin.id}"></span>
            </span>
            <span class="comp-card-meta">
              <strong class="comp-card-name">${skin.name}</strong>
              ${tag}
            </span>
          </button>
        `;
      }).join('');

      gridEl.querySelectorAll('[data-sprite-skin]').forEach(el => {
        const id = el.getAttribute('data-sprite-skin');
        applySpriteStyle(el, id, id === selectedSkinId ? boardLiveState : previewState, 48);
      });

      gridEl.querySelectorAll('[data-skin-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectSkin(btn.getAttribute('data-skin-id') || 'capybara');
        });
      });
    }

    function buildCurrentOptions() {
      return {
        user: getActiveUser(),
        skin: selectedSkinId,
        variant: variantSelect ? variantSelect.value : 'card',
        state: stateSelect ? stateSelect.value : 'auto',
        theme: themeSelect ? themeSelect.value : 'ink',
        lang: getLang(),
        say: sayInput ? sayInput.value.trim() : '',
        mode: 'dock'
      };
    }

    function buildLiveSvgUrl(opts) {
      const p = new URLSearchParams();
      p.set('theme', opts.theme);
      p.set('lang', opts.lang);
      p.set('skin', opts.skin);
      p.set('variant', opts.variant);
      if (opts.state && opts.state !== 'auto') p.set('state', opts.state);
      if (opts.say) p.set('say', opts.say.slice(0, 110));
      return `/api/companion/${encodeURIComponent(opts.user)}.svg?${p.toString()}`;
    }

    function updateWorkbench() {
      const opts = buildCurrentOptions();
      if (svgPreview) {
        svgPreview.src = buildLiveSvgUrl(opts);
        svgPreview.alt = `@${opts.user} companion (${opts.skin})`;
      }
      if (codeOutput) {
        if (activeCodeTab === 'widget') {
          codeOutput.value = PC.generateEmbedCode(opts);
        } else if (activeCodeTab === 'action') {
          codeOutput.value = PC.generateActionYaml(opts);
        } else {
          codeOutput.value = PC.generateMarkdownSnippet(opts);
        }
      }
      if (floatingDockEl) {
        floatingDockEl.setAttribute('user', opts.user);
        floatingDockEl.setAttribute('skin', opts.skin);
        floatingDockEl.setAttribute('theme', opts.theme);
        if (opts.state && opts.state !== 'auto') floatingDockEl.setAttribute('state', opts.state);
        floatingDockEl.setAttribute('say', opts.say);
      }
    }

    function selectSkin(skinId) {
      selectedSkinId = PC.getSkin(skinId).id;
      if ( stateSelect && stateSelect.value !== 'auto' ) {
        boardLiveState = stateSelect.value;
      }
      updateBoardHud();
      renderSkinGrid();
      updateWorkbench();
    }

    // Eventos de filtros y controles
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        renderSkinGrid();
      });
    }
    [variantSelect, stateSelect, themeSelect].forEach(sel => {
      if (!sel) return;
      sel.addEventListener('change', () => {
        if (sel === stateSelect && stateSelect.value !== 'auto') {
          boardLiveState = stateSelect.value;
          updateBoardHud();
        }
        renderSkinGrid();
        updateWorkbench();
      });
    });
    if (sayInput) {
      sayInput.addEventListener('input', () => {
        updateBoardHud();
        updateWorkbench();
      });
    }
    if (studioThemeSelect && themeSelect) {
      studioThemeSelect.addEventListener('change', () => {
        themeSelect.value = studioThemeSelect.value;
        updateWorkbench();
      });
    }

    // Pestañas de exportación de código
    codeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeCodeTab = tab.getAttribute('data-comp-tab') || 'markdown';
        codeTabs.forEach(t => {
          const on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', String(on));
        });
        updateWorkbench();
      });
    });

    // Copiar código
    if (copyCodeBtn && codeOutput) {
      copyCodeBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeOutput.value);
          const prev = copyCodeBtn.textContent;
          copyCodeBtn.textContent = getLang() === 'en' ? 'Copied!' : '¡Copiado!';
          setTimeout(() => { copyCodeBtn.textContent = prev; }, 1600);
        } catch {}
      });
    }

    // Descargar SVG animado
    if (downloadSvgBtn) {
      downloadSvgBtn.addEventListener('click', async () => {
        const opts = buildCurrentOptions();
        const url = buildLiveSvgUrl(opts);
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const svgText = await res.text();
          const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${opts.skin}-${opts.variant}-${opts.theme}.svg`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        } catch {}
      });
    }

    // Probar Widget Web Component flotante en vivo en la página
    if (toggleDockBtn) {
      toggleDockBtn.addEventListener('click', () => {
        const lang = getLang();
        if (floatingDockEl && floatingDockEl.isConnected) {
          floatingDockEl.remove();
          floatingDockEl = null;
          toggleDockBtn.textContent = lang === 'en' ? 'Test floating Web Widget here' : 'Probar Widget flotante aquí';
        } else {
          const opts = buildCurrentOptions();
          floatingDockEl = PC.mount({
            user: opts.user,
            skin: opts.skin,
            theme: opts.theme,
            state: opts.state === 'auto' ? boardLiveState : opts.state,
            mode: 'dock',
            position: 'bottom-right',
            lang: opts.lang,
            say: opts.say
          });
          toggleDockBtn.textContent = lang === 'en' ? 'Hide floating Web Widget' : 'Ocultar Widget flotante';
        }
      });
    }

    // Botón para saltar del HUD del tablero al Laboratorio
    if (openLabBtn) {
      openLabBtn.addEventListener('click', () => {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Clic sobre el sprite del tablero cambia de estado en vivo
    if (boardSprite && boardSprite.parentElement) {
      boardSprite.parentElement.addEventListener('click', () => {
        const idx = (PC.STATES.indexOf(boardLiveState) + 1) % PC.STATES.length;
        boardLiveState = PC.STATES[idx];
        updateBoardHud();
      });
    }

    // Reacción en tiempo real al progreso de la partida en el tablero
    if (progressPercentText && typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(() => {
        const pct = parseInt(progressPercentText.textContent || '0', 10) || 0;
        if (pct === 0) {
          lastMilestone = 0;
          return;
        }
        if (pct >= 100 && lastMilestone < 100) {
          lastMilestone = 100;
          boardLiveState = 'VICTORY_GITHUB';
          updateBoardHud();
        } else if (pct >= 50 && lastMilestone < 50) {
          lastMilestone = 50;
          boardLiveState = 'VICTORY_GITHUB';
          updateBoardHud();
          setTimeout(() => {
            if (boardLiveState === 'VICTORY_GITHUB' && lastMilestone < 100) {
              boardLiveState = 'WALK';
              updateBoardHud();
            }
          }, 3000);
        } else if (pct > 5 && lastMilestone === 0) {
          lastMilestone = 5;
          boardLiveState = 'FOCUS';
          updateBoardHud();
        }
      });
      obs.observe(progressPercentText, { childList: true, characterData: true, subtree: true });
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        setTimeout(() => {
          const text = (playPauseBtn.textContent || '').toLowerCase();
          const isPaused = text.includes('reanudar') || text.includes('resume') || text.includes('play');
          boardLiveState = isPaused ? 'SLEEP' : 'FOCUS';
          updateBoardHud();
        }, 50);
      });
    }

    window.addEventListener('languagechange-app', () => {
      renderCategoryPills();
      renderSkinGrid();
      updateBoardHud();
      updateWorkbench();
    });

    // Inicialización y carga de spritesheets en Base64
    renderCategoryPills();
    renderSkinGrid();
    updateBoardHud();
    updateWorkbench();

    PC.loadBundle().then(() => {
      updateBoardHud();
      renderSkinGrid();
    });
  });
})();

