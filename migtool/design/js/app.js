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

  const gateSelect = document.querySelector("[data-target-gate]");
  if (gateSelect) {
    const ok = document.querySelector("[data-gate-ok]");
    const blocked = document.querySelector("[data-gate-blocked]");
    const badge = document.querySelector("[data-run-badge]");
    const assetsStatus = document.querySelector("[data-assets-status]");
    const collectionsStatus = document.querySelector("[data-collections-status]");
    const dataStatus = document.querySelector("[data-data-status]");
    const modePanel = document.querySelector("[data-mode-panel]");
    const runPanel = document.querySelector("[data-run-panel]");

    const applyGate = () => {
      const ready = gateSelect.value === "staging";
      if (ok) ok.hidden = !ready;
      if (blocked) blocked.hidden = ready;
      if (modePanel) modePanel.hidden = !ready;
      if (runPanel) runPanel.hidden = !ready;
      if (badge) {
        badge.className = ready ? "badge badge-ok" : "badge badge-draft";
        badge.textContent = ready ? "Ready · Staging" : "Gated · Production";
      }
      if (assetsStatus) {
        assetsStatus.innerHTML = ready
          ? '<span class="badge badge-ok">Complete</span> <span class="meta">12,480 files</span>'
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
})();
