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

  // Prepare assets wizard (design/prepare-assets.html)
  const prepareRail = document.querySelector("[data-prepare-rail]");
  if (prepareRail) {
    const panels = document.querySelectorAll("[data-prepare-panel]");
    const railSteps = document.querySelectorAll("[data-prepare-rail-step]");
    const badge = document.querySelector("[data-prepare-badge]");
    const log = document.querySelector("[data-prepare-log]");
    const metaSelect = document.querySelector("[data-meta-select]");
    const modeBtns = document.querySelectorAll("[data-prepare-mode]");
    const metaPanels = {
      directus: document.querySelector('[data-meta-panel="directus"]'),
      map: document.querySelector('[data-meta-panel="map"]'),
      generate: document.querySelector('[data-meta-panel="generate"]'),
    };
    const metaTitle = document.querySelector("[data-meta-title]");
    const metaSub = document.querySelector("[data-meta-sub]");
    const detectNote = document.querySelector("[data-detect-note]");
    const phToggle = document.querySelector("[data-placeholder-toggle]");
    const phNote = document.querySelector("[data-ph-note]");
    const phNoteOff = document.querySelector("[data-ph-note-off]");
    const phBadges = document.querySelectorAll("[data-ph-badge]");
    const phStat = document.querySelector("[data-ph-stat]");
    const metaStat = document.querySelector("[data-meta-stat]");
    const writeBtn = document.querySelector("[data-prepare-write]");
    const nextLink = document.querySelector("[data-prepare-next]");
    const doneNote = document.querySelector("[data-prepare-done]");
    const uploadIdle = document.querySelector("[data-prepare-upload-idle]");
    const uploadRunning = document.querySelector("[data-prepare-upload-running]");
    const uploadDone = document.querySelector("[data-prepare-upload-done]");
    const uploadLog = document.querySelector("[data-prepare-upload-log]");
    const uploadStateBtns = document.querySelectorAll("[data-prepare-upload-state]");

    let step = 1;
    let mode = "directus";
    let uploadState = "running";

    const titles = {
      directus: {
        h: "Normalize Directus metadata",
        s: "Source already matches files_metadata.json. We’ll verify records against disk and copy into prepared.",
        note: "Detected Directus-shaped metadata. Step 2 will copy fields with light normalization.",
        noteClass: "notice notice-ok",
        stat: "passthrough",
      },
      map: {
        h: "Map source JSON → files_metadata.json",
        s: "Match source keys to Directus file fields. Unmapped keys are dropped unless you pin them into metadata.",
        note: "Selected wp-media.json needs mapping before prepare can write files_metadata.json.",
        noteClass: "notice notice-info",
        stat: "mapped",
      },
      generate: {
        h: "Generate files_metadata.json from disk",
        s: "No inventory JSON — invent Directus file records from filenames, MIME types, and file sizes.",
        note: "No metadata JSON. Step 2 will generate records from the selected folder.",
        noteClass: "notice notice-warn",
        stat: "generated",
      },
    };

    const stepLabels = {
      1: "Step 1 · Locate",
      2: "Step 2 · Metadata",
      3: "Step 3 · Gaps",
      4: "Step 4 · Write",
      5: "Step 5 · Upload",
    };

    const uploadLogs = {
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

    const applyUploadState = (next) => {
      uploadState = next;
      uploadStateBtns.forEach((btn) => {
        btn.classList.toggle("on", btn.dataset.prepareUploadState === uploadState);
      });
      if (uploadIdle) uploadIdle.hidden = uploadState !== "ready";
      if (uploadRunning) uploadRunning.hidden = uploadState !== "running";
      if (uploadDone) uploadDone.hidden = uploadState !== "done";
      if (uploadLog) uploadLog.innerHTML = uploadLogs[uploadState].join("");
      if (badge && step === 5) {
        if (uploadState === "ready") {
          badge.className = "badge badge-run";
          badge.textContent = "Ready to upload";
        } else if (uploadState === "running") {
          badge.className = "badge badge-run";
          badge.textContent = "Uploading…";
        } else {
          badge.className = "badge badge-ok";
          badge.textContent = "Upload complete";
        }
      }
    };

    const showStep = (n) => {
      step = Number(n);
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.preparePanel !== String(step);
      });
      railSteps.forEach((el) => {
        const i = Number(el.dataset.prepareRailStep);
        el.classList.remove("on", "done");
        if (i < step) el.classList.add("done");
        if (i === step) el.classList.add("on");
      });
      if (badge) {
        if (step === 5) {
          applyUploadState(uploadState);
        } else {
          badge.className = step === 4 ? "badge badge-ok" : "badge badge-map";
          badge.textContent = stepLabels[step];
        }
      }
      if (log) {
        const lines = {
          1: '<div class="info">locate   selected export1/files · 38 binaries</div>',
          2: '<div class="info">metadata mode = ' + mode + '</div>',
          3: '<div class="warn">gaps     2 missing · placeholders ' + (phToggle && phToggle.checked ? "on" : "off") + "</div>",
          4: '<div class="info">write    ready → prepared/target_3/</div>',
        };
        log.innerHTML = lines[step] || "";
      }
    };

    const applyMode = (next) => {
      mode = next;
      modeBtns.forEach((btn) => {
        btn.classList.toggle("on", btn.dataset.prepareMode === mode);
      });
      if (metaSelect) metaSelect.value = mode;
      Object.entries(metaPanels).forEach(([key, el]) => {
        if (el) el.hidden = key !== mode;
      });
      const copy = titles[mode];
      if (metaTitle) metaTitle.textContent = copy.h;
      if (metaSub) metaSub.textContent = copy.s;
      if (detectNote) {
        detectNote.className = copy.noteClass;
        detectNote.textContent = copy.note;
      }
      if (metaStat) metaStat.textContent = copy.stat;
    };

    const applyPlaceholders = () => {
      const on = !phToggle || phToggle.checked;
      if (phNote) phNote.hidden = !on;
      if (phNoteOff) phNoteOff.hidden = on;
      phBadges.forEach((b) => {
        b.textContent = on ? "Placeholder" : "Skip";
        b.className = on ? "badge badge-run" : "badge badge-draft";
      });
      if (phStat) phStat.textContent = on ? "enabled" : "off";
    };

    document.querySelectorAll("[data-prepare-goto]").forEach((btn) => {
      btn.addEventListener("click", () => showStep(btn.dataset.prepareGoto));
    });

    modeBtns.forEach((btn) => {
      btn.addEventListener("click", () => applyMode(btn.dataset.prepareMode));
    });

    if (metaSelect) {
      metaSelect.addEventListener("change", () => applyMode(metaSelect.value));
    }

    document.querySelectorAll("[data-folder-tree] .win-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".win-twist") && !e.target.closest(".win-twist.spacer")) {
          return;
        }
        document.querySelectorAll("[data-folder-tree] .win-row").forEach((n) => n.classList.remove("selected"));
        row.classList.add("selected");
        const pathEl = document.querySelector(".win-explorer-path");
        const name = row.querySelector(".win-label b");
        if (pathEl && name) {
          const parts = ["extracted", "upload_3"];
          if (name.textContent !== "upload_3") {
            parts.push("export1");
            if (name.textContent !== "export1") parts.push(name.textContent);
          }
          pathEl.textContent = parts.join("\\");
        }
        const filesPath = document.getElementById("files-path");
        if (filesPath && row.hasAttribute("data-folder-pick")) {
          filesPath.value = "extracted/upload_3/export1/files";
        }
      });
    });

    document.querySelectorAll("[data-folder-tree] [data-tree-toggle] .win-twist").forEach((twist) => {
      twist.addEventListener("click", (e) => {
        e.stopPropagation();
        const node = twist.closest(".win-node");
        if (!node) return;
        node.classList.toggle("open");
        const ico = node.querySelector(":scope > .win-row .win-ico-folder");
        if (ico) ico.classList.toggle("open", node.classList.contains("open"));
        twist.setAttribute(
          "aria-label",
          node.classList.contains("open") ? "Collapse" : "Expand"
        );
      });
    });

    if (phToggle) {
      phToggle.addEventListener("change", applyPlaceholders);
    }

    if (writeBtn) {
      writeBtn.addEventListener("click", () => {
        if (doneNote) doneNote.hidden = false;
        if (nextLink) nextLink.hidden = false;
        writeBtn.textContent = "Written";
        writeBtn.classList.add("btn-disabled");
        writeBtn.disabled = true;
        if (badge) {
          badge.className = "badge badge-ok";
          badge.textContent = "Prepared";
        }
        if (log) {
          log.innerHTML =
            '<div class="ok">write    files/ · 38 entries</div>' +
            '<div class="ok">write    files_metadata.json</div>' +
            '<div class="ok">done     prepared/target_3 ready</div>';
        }
      });
    }

    uploadStateBtns.forEach((btn) => {
      btn.addEventListener("click", () => applyUploadState(btn.dataset.prepareUploadState));
    });

    const uploadStart = document.querySelector("[data-prepare-upload-start]");
    if (uploadStart) {
      uploadStart.addEventListener("click", () => applyUploadState("running"));
    }

    applyMode("directus");
    applyPlaceholders();
    applyUploadState("running");
    showStep(1);
  }
})();
