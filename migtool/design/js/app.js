(function () {
  const drop = document.querySelector("[data-dropzone]");
  if (drop) {
    ["dragenter", "dragover"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("over");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("over");
      });
    });
  }

  document.querySelectorAll("[data-cms]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-cms]").forEach((n) => n.classList.remove("selected"));
      el.classList.add("selected");
    });
  });

  document.querySelectorAll("[data-file]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-file]").forEach((n) => n.classList.remove("active"));
      el.classList.add("active");
      const target = document.querySelector("[data-file-title]");
      if (target) target.textContent = el.dataset.file;
    });
  });

  document.querySelectorAll("[data-tabs] .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const group = tab.parentElement;
      group.querySelectorAll(".tab").forEach((t) => t.classList.remove("on"));
      tab.classList.add("on");
      const id = tab.dataset.tab;
      document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== id;
      });
    });
  });

  document.querySelectorAll("[data-modes] [data-mode]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-modes] [data-mode]").forEach((n) => n.classList.remove("selected"));
      el.classList.add("selected");
    });
  });

  const phaseRoot = document.querySelector("[data-phases]");
  const phasePayload = document.querySelector("[data-phase-payload]");
  const startBtn = document.querySelector("[data-start-btn]");

  const readPhases = () => {
    const flags = { schema: false, data: false, files: false, flows: false };
    if (!phaseRoot) return flags;
    phaseRoot.querySelectorAll("[data-phase]").forEach((input) => {
      if (flags.hasOwnProperty(input.value)) {
        flags[input.value] = input.checked;
      }
    });
    return flags;
  };

  const renderPhasePayload = () => {
    if (!phasePayload) return;
    const flags = readPhases();
    const any = Object.values(flags).some(Boolean);
    phasePayload.textContent = JSON.stringify(flags, null, 2);
    if (startBtn) {
      startBtn.disabled = !any;
      startBtn.classList.toggle("btn-disabled", !any);
      startBtn.title = any
        ? "POST migrate with selected phases"
        : "Select at least one phase";
    }
  };

  if (phaseRoot) {
    phaseRoot.querySelectorAll("[data-phase]").forEach((input) => {
      input.addEventListener("change", renderPhasePayload);
    });
    renderPhasePayload();
  }

  if (startBtn && phasePayload) {
    startBtn.addEventListener("click", () => {
      const flags = readPhases();
      if (!Object.values(flags).some(Boolean)) return;
      window.alert(
        "Would POST /api/projects/{id}/targets/{tid}/migrate\n\n" +
          JSON.stringify(flags, null, 2)
      );
    });
  }

  const gateSelect = document.querySelector("[data-target-gate]");
  if (gateSelect) {
    const ok = document.querySelector("[data-gate-ok]");
    const blocked = document.querySelector("[data-gate-blocked]");
    const badge = document.querySelector("[data-run-badge]");
    const assetsStatus = document.querySelector("[data-assets-status]");
    const collectionsStatus = document.querySelector("[data-collections-status]");
    const dataStatus = document.querySelector("[data-data-status]");
    const modePanel = document.querySelector("[data-mode-panel]");
    const phasePanel = document.querySelector("[data-phase-panel]");
    const runPanel = document.querySelector("[data-run-panel]");

    const applyGate = () => {
      const ready = gateSelect.value === "staging";
      if (ok) ok.hidden = !ready;
      if (blocked) blocked.hidden = ready;
      if (modePanel) modePanel.hidden = !ready;
      if (phasePanel) phasePanel.hidden = !ready;
      if (runPanel) runPanel.hidden = !ready;
      if (badge) {
        badge.className = ready ? "badge badge-ok" : "badge badge-draft";
        badge.textContent = ready ? "Ready · Staging" : "Gated · Production";
      }
      if (assetsStatus) {
        assetsStatus.innerHTML = ready
          ? '<span class="badge badge-ok">Complete</span> <span class="meta">38 files</span>'
          : '<span class="badge badge-draft">Not started</span> <span class="meta">0 files</span>';
      }
      if (collectionsStatus) {
        collectionsStatus.innerHTML = ready
          ? '<span class="badge badge-ok">Applied</span> <span class="meta">6 · wiped Mar 8</span>'
          : '<span class="badge badge-draft">Not applied</span> <span class="meta">schema pending</span>';
      }
      if (dataStatus) {
        dataStatus.innerHTML = ready
          ? '<span class="badge badge-ok">Ready</span> <span class="meta">last upsert #14</span>'
          : '<span class="badge badge-draft">Blocked</span> <span class="meta">finish setup first</span>';
      }
    };

    gateSelect.addEventListener("change", applyGate);
    applyGate();
  }

  // Assets upload flow (design/assets.html)
  const assetsRoot = document.querySelector("[data-assets-rail]");
  if (assetsRoot) {
    const panels = document.querySelectorAll("[data-assets-panel]");
    const railSteps = document.querySelectorAll("[data-rail]");
    const badge = document.querySelector("[data-assets-badge]");
    const log = document.querySelector("[data-assets-log]");
    const targetSelect = document.querySelector("[data-assets-target]");
    const targetLabel = document.querySelector("[data-assets-target-label]");
    const targetUrl = document.querySelector("[data-assets-url]");
    const stateBtns = document.querySelectorAll("[data-assets-state]");
    const idle = document.querySelector("[data-upload-idle]");
    const running = document.querySelector("[data-upload-running]");
    const done = document.querySelector("[data-upload-done]");

    let step = 3;
    let state = "ready";

    const logs = {
      ready: [
        '<div class="info">09:11:58  assets  inventory loaded — 38 records</div>',
        '<div class="ok">09:12:01  assets  validate ok — 0 missing</div>',
        '<div class="info">09:12:04  assets  waiting for upload</div>',
      ],
      running: [
        '<div class="ok">09:12:04  assets  folders.json applied — 3</div>',
        '<div class="info">09:12:08  assets  batch 1/8 uploaded</div>',
        '<div class="info">09:13:22  assets  batch 4/8 · 18/38</div>',
      ],
      done: [
        '<div class="ok">09:12:04  assets  folders applied</div>',
        '<div class="ok">09:15:16  assets  batch 8/8 uploaded</div>',
        '<div class="ok">09:15:16  assets  complete — 0 failures</div>',
        '<div class="warn">09:15:16  assets  Production still has 0 files</div>',
      ],
    };

    const showStep = (n) => {
      step = Number(n);
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.assetsPanel !== String(step);
      });
      railSteps.forEach((el) => {
        const i = Number(el.dataset.rail);
        el.classList.remove("on", "done");
        if (i < step) el.classList.add("done");
        if (i === step) el.classList.add("on");
      });
    };

    const applyState = (next) => {
      state = next;
      stateBtns.forEach((btn) => {
        btn.classList.toggle("on", btn.dataset.assetsState === state);
      });
      if (idle) idle.hidden = state !== "ready";
      if (running) running.hidden = state !== "running";
      if (done) done.hidden = state !== "done";

      if (state === "ready") {
        showStep(3);
        if (badge) {
          badge.className = "badge badge-run";
          badge.textContent = "Ready to upload";
        }
      } else if (state === "running") {
        showStep(3);
        if (badge) {
          badge.className = "badge badge-run";
          badge.textContent = "Uploading…";
        }
      } else {
        showStep(4);
        if (badge) {
          badge.className = "badge badge-ok";
          badge.textContent = "Complete on Staging";
        }
      }
      if (log) log.innerHTML = logs[state].join("");
    };

    document.querySelectorAll("[data-assets-goto]").forEach((btn) => {
      btn.addEventListener("click", () => showStep(btn.dataset.assetsGoto));
    });

    document.querySelectorAll("[data-assets-state], [data-assets-state-set]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyState(btn.dataset.assetsState || btn.dataset.assetsStateSet);
      });
    });

    const start = document.querySelector("[data-assets-start]");
    if (start) {
      start.addEventListener("click", () => applyState("running"));
    }

    if (targetSelect) {
      targetSelect.addEventListener("change", () => {
        const staging = targetSelect.value === "staging";
        if (targetLabel) targetLabel.textContent = staging ? "Staging" : "Production";
        if (targetUrl) {
          targetUrl.textContent = staging
            ? "https://cms-staging.acme.studio"
            : "https://cms.acme.studio";
        }
      });
    }

    applyState("ready");
  }
})();
