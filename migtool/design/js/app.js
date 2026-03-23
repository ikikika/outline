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

  // Data models wizard (design/mapping.html)
  const modelsRail = document.querySelector("[data-models-rail]");
  if (modelsRail) {
    const panels = document.querySelectorAll("[data-models-panel]");
    const railSteps = document.querySelectorAll("[data-models-rail-step]");
    const badge = document.querySelector("[data-models-badge]");
    const packBtns = document.querySelectorAll("[data-models-pack]");
    const continueLabel = document.querySelector("[data-models-continue-label]");
    const writeTitle = document.querySelector("[data-models-write-title]");
    const writeSub = document.querySelector("[data-models-write-sub]");
    const writeBtn = document.querySelector("[data-models-write]");
    const doneNote = document.querySelector("[data-models-done]");
    const nextLinks = document.querySelector("[data-models-next]");
    const targetSelect = document.querySelector("[data-models-target]");
    const targetLabels = document.querySelectorAll("[data-models-target-label]");
    const outPath = document.querySelector("[data-models-out-path]");
    const applyStateBtns = document.querySelectorAll("[data-models-apply-state]");
    const applyStart = document.querySelector("[data-models-apply-start]");
    const applyNext = document.querySelector("[data-models-apply-next]");
    const applyLog = document.querySelector("[data-models-apply-log]");
    const applyErrors = document.querySelector("[data-models-apply-errors]");
    const collCount = document.querySelector("[data-models-coll-count]");
    const fieldCount = document.querySelector("[data-models-field-count]");
    const relCount = document.querySelector("[data-models-rel-count]");
    const errCount = document.querySelector("[data-models-err-count]");
    const errLabel = document.querySelector("[data-models-err-label]");
    const collLabel = document.querySelector("[data-models-coll-label]");
    const applyStatus = document.querySelector("[data-models-apply-status]");
    const applyPct = document.querySelector("[data-models-apply-pct]");
    const applyBar = document.querySelector("[data-models-apply-bar] span");
    const applyCurrent = document.querySelector("[data-models-apply-current]");
    const applyBarWrap = document.querySelector("[data-models-apply-bar]");

    let step = 1;
    let pack = "directus";
    let applyState = "ready";
    let applyTimer = null;

    const TOTAL = { collections: 88, fields: 594, relations: 106 };
    const COLL_NAMES = [
      "authors",
      "categories",
      "posts",
      "pages",
      "issues",
      "media_meta",
      "tags",
      "redirects",
    ];

    const stepLabels = {
      1: "Step 1 · Scan",
      2: "Step 2 · Detect",
      3: "Step 3 · Schema",
      4: "Step 4 · Confirm",
      5: "Step 5 · Apply",
    };

    const setHidden = (els, hidden) => {
      els.forEach((el) => {
        if (el) el.hidden = hidden;
      });
    };

    const stopApplyTimer = () => {
      if (applyTimer) {
        clearInterval(applyTimer);
        applyTimer = null;
      }
    };

    const renderCounts = (created, fields, rels, errors) => {
      if (collCount) collCount.textContent = `${created} / ${TOTAL.collections}`;
      if (fieldCount) fieldCount.textContent = `${fields} / ${TOTAL.fields}`;
      if (relCount) relCount.textContent = `${rels} / ${TOTAL.relations}`;
      if (errCount) errCount.textContent = String(errors);
      if (errLabel) errLabel.textContent = errors ? "failed" : "none";
      const pct = Math.round((created / TOTAL.collections) * 100);
      if (applyPct) applyPct.textContent = `${pct}%`;
      if (applyBar) applyBar.style.width = `${pct}%`;
    };

    const applyLogs = {
      ready: [
        '<div class="info">14:02:01  schema  waiting — POST migrate when ready</div>',
        '<div class="info">14:02:01  schema  prepared/target_3/schema/ · 88 collections</div>',
      ],
      running: [
        '<div class="ok">14:02:18  schema  Importing schema…</div>',
        '<div class="info">14:02:18  schema  Creating folder collections…</div>',
        '<div class="ok">14:02:19  schema  ✅ Collection created: content</div>',
        '<div class="info">14:02:19  schema  Creating collections…</div>',
        '<div class="ok">14:02:21  schema  ✅ Collection created: authors</div>',
        '<div class="ok">14:02:22  schema  ✅ Collection created: categories</div>',
        '<div class="ok">14:02:24  schema  ✅ Collection created: posts</div>',
        '<div class="info">14:02:25  schema  Creating fields… (phase 1)</div>',
        '<div class="ok">14:02:26  schema  ✅ Field created: posts.title</div>',
      ],
      done: [
        '<div class="ok">14:02:18  schema  Importing schema…</div>',
        '<div class="ok">14:04:02  schema  ✅ Collection created: redirects (88/88)</div>',
        '<div class="ok">14:04:11  schema  fields 594/594 · relations 106/106</div>',
        '<div class="ok">14:04:12  schema  complete — 0 failures</div>',
      ],
      failed: [
        '<div class="ok">14:02:18  schema  Importing schema…</div>',
        '<div class="ok">14:02:24  schema  ✅ Collection created: posts (41/88)</div>',
        '<div class="err">14:03:01  schema  ❌ Failed to create collection \'issues\': column "legacy_id" already exists</div>',
        '<div class="err">14:03:08  schema  ❌ Failed to create relation pages.parent_id: related collection missing</div>',
        '<div class="warn">14:03:09  schema  stopped — 41 created · 2 failed · 45 remaining</div>',
      ],
    };

    const applyApplyState = (next) => {
      applyState = next;
      stopApplyTimer();

      applyStateBtns.forEach((btn) => {
        btn.classList.toggle("on", btn.dataset.modelsApplyState === applyState);
      });

      if (applyLog) applyLog.innerHTML = applyLogs[applyState].join("");
      if (applyErrors) applyErrors.hidden = applyState !== "failed";
      if (applyNext) applyNext.hidden = applyState !== "done";
      if (applyBarWrap) {
        applyBarWrap.classList.remove("ok", "warn", "err");
        if (applyState === "failed") applyBarWrap.classList.add("err");
        else if (applyState === "running") applyBarWrap.classList.add("ok");
        else if (applyState === "done") applyBarWrap.classList.add("ok");
      }

      if (applyStart) {
        if (applyState === "ready") {
          applyStart.textContent = "Apply schema";
          applyStart.disabled = false;
          applyStart.classList.remove("btn-disabled");
        } else if (applyState === "running") {
          applyStart.textContent = "Applying…";
          applyStart.disabled = true;
          applyStart.classList.add("btn-disabled");
        } else if (applyState === "done") {
          applyStart.textContent = "Applied";
          applyStart.disabled = true;
          applyStart.classList.add("btn-disabled");
        } else {
          applyStart.textContent = "Retry apply";
          applyStart.disabled = false;
          applyStart.classList.remove("btn-disabled");
        }
      }

      if (applyState === "ready") {
        renderCounts(0, 0, 0, 0);
        if (collLabel) collLabel.textContent = "waiting";
        if (applyStatus) applyStatus.textContent = "Ready to apply";
        if (applyCurrent) applyCurrent.textContent = "—";
      } else if (applyState === "running") {
        let created = 12;
        let fields = 48;
        let rels = 4;
        renderCounts(created, fields, rels, 0);
        if (collLabel) collLabel.textContent = "creating";
        if (applyStatus) applyStatus.textContent = "Applying collections…";
        if (applyCurrent) applyCurrent.textContent = "posts";
        if (badge && step === 5) {
          badge.className = "badge badge-run";
          badge.textContent = "Applying…";
        }
        let tick = 0;
        applyTimer = setInterval(() => {
          tick += 1;
          created = Math.min(TOTAL.collections, created + 3);
          fields = Math.min(TOTAL.fields, fields + 18);
          rels = Math.min(TOTAL.relations, rels + 2);
          renderCounts(created, fields, rels, 0);
          if (applyCurrent) {
            applyCurrent.textContent = COLL_NAMES[tick % COLL_NAMES.length];
          }
          if (applyLog && tick % 2 === 0) {
            const name = COLL_NAMES[tick % COLL_NAMES.length];
            applyLog.insertAdjacentHTML(
              "beforeend",
              `<div class="ok">14:02:${String(26 + tick).padStart(2, "0")}  schema  ✅ Collection created: ${name} (${created}/${TOTAL.collections})</div>`
            );
            applyLog.scrollTop = applyLog.scrollHeight;
          }
          if (created >= TOTAL.collections) {
            stopApplyTimer();
            applyApplyState("done");
          }
        }, 700);
      } else if (applyState === "done") {
        renderCounts(TOTAL.collections, TOTAL.fields, TOTAL.relations, 0);
        if (collLabel) collLabel.textContent = "created";
        if (applyStatus) applyStatus.textContent = "Schema applied";
        if (applyCurrent) applyCurrent.textContent = "complete";
        if (badge && step === 5) {
          badge.className = "badge badge-ok";
          badge.textContent = "Applied";
        }
      } else {
        renderCounts(41, 210, 38, 2);
        if (collLabel) collLabel.textContent = "partial";
        if (applyStatus) applyStatus.textContent = "Apply failed";
        if (applyCurrent) applyCurrent.textContent = "issues";
        if (badge && step === 5) {
          badge.className = "badge badge-err";
          badge.textContent = "Apply failed";
        }
      }
    };

    const applyPack = (next) => {
      pack = next;
      packBtns.forEach((btn) => {
        btn.classList.toggle("on", btn.dataset.modelsPack === pack);
      });

      const isDirectus = pack === "directus";
      setHidden(document.querySelectorAll("[data-models-tree-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-tree-foreign]"), isDirectus);
      setHidden(document.querySelectorAll("[data-models-scan-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-scan-foreign]"), isDirectus);
      setHidden(document.querySelectorAll("[data-models-scan-note-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-scan-note-foreign]"), isDirectus);
      setHidden(document.querySelectorAll("[data-models-detect-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-detect-foreign]"), isDirectus);
      setHidden(document.querySelectorAll("[data-models-write-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-write-foreign]"), isDirectus);
      setHidden(document.querySelectorAll("[data-models-confirm-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-confirm-foreign]"), isDirectus);
      setHidden(document.querySelectorAll("[data-models-apply-directus]"), !isDirectus);
      setHidden(document.querySelectorAll("[data-models-apply-foreign]"), isDirectus);

      const pathEl = document.querySelector("[data-models-tree-path]");
      if (pathEl) {
        pathEl.textContent = isDirectus
          ? "extracted\\upload_1\\export1"
          : "extracted\\upload_2\\wordpress-dump";
      }

      if (continueLabel) {
        continueLabel.textContent = isDirectus
          ? "Continue to write"
          : "Continue (deferred)";
      }
      if (writeTitle) {
        writeTitle.textContent = isDirectus
          ? "Move schema into prepared"
          : "Nothing to prepare yet";
      }
      if (writeSub) {
        writeSub.textContent = isDirectus
          ? "Copy verified Directus schema files into the active target’s prepared folder. Does not apply collections to Directus yet."
          : "Foreign JSON stays parked under extracted. Schema mapping will land in a later release.";
      }
    };

    const showStep = (n) => {
      step = Number(n);
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.modelsPanel !== String(step);
      });
      railSteps.forEach((el) => {
        const i = Number(el.dataset.modelsRailStep);
        el.classList.remove("on", "done");
        if (i < step) el.classList.add("done");
        if (i === step) el.classList.add("on");
      });
      if (badge) {
        if (step === 5 && pack === "directus") {
          if (applyState === "running") {
            badge.className = "badge badge-run";
            badge.textContent = "Applying…";
          } else if (applyState === "done") {
            badge.className = "badge badge-ok";
            badge.textContent = "Applied";
          } else if (applyState === "failed") {
            badge.className = "badge badge-err";
            badge.textContent = "Apply failed";
          } else {
            badge.className = "badge badge-run";
            badge.textContent = "Ready to apply";
          }
        } else {
          const written =
            pack === "directus" && doneNote && !doneNote.hidden && step === 3;
          badge.className = written
            ? "badge badge-ok"
            : step >= 3 && pack === "foreign"
              ? "badge badge-draft"
              : "badge badge-map";
          badge.textContent = written
            ? "Schema prepared"
            : step >= 3 && pack === "foreign"
              ? "Deferred"
              : stepLabels[step];
        }
      }
    };

    document.querySelectorAll("[data-models-goto]").forEach((btn) => {
      btn.addEventListener("click", () => showStep(btn.dataset.modelsGoto));
    });

    packBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (doneNote) doneNote.hidden = true;
        if (nextLinks) nextLinks.hidden = true;
        if (writeBtn) {
          writeBtn.textContent = "Write schema to prepared";
          writeBtn.classList.remove("btn-disabled");
          writeBtn.disabled = false;
        }
        stopApplyTimer();
        applyState = "ready";
        applyPack(btn.dataset.modelsPack);
        if (pack === "directus") applyApplyState("ready");
        showStep(step);
      });
    });

    if (writeBtn) {
      writeBtn.addEventListener("click", () => {
        if (doneNote) doneNote.hidden = false;
        if (nextLinks) nextLinks.hidden = false;
        writeBtn.textContent = "Written";
        writeBtn.classList.add("btn-disabled");
        writeBtn.disabled = true;
        if (badge) {
          badge.className = "badge badge-ok";
          badge.textContent = "Schema prepared";
        }
      });
    }

    applyStateBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        applyApplyState(btn.dataset.modelsApplyState);
      });
    });

    if (applyStart) {
      applyStart.addEventListener("click", () => {
        applyApplyState(applyState === "failed" ? "running" : "running");
      });
    }

    if (targetSelect) {
      targetSelect.addEventListener("change", () => {
        const staging = targetSelect.value === "Staging";
        targetLabels.forEach((el) => {
          el.textContent = staging ? "Staging" : "Production";
        });
        if (outPath) {
          outPath.textContent = staging
            ? "uploads/project_1/prepared/target_3/schema/"
            : "uploads/project_1/prepared/target_4/schema/";
        }
      });
    }

    applyPack("directus");
    applyApplyState("ready");
    showStep(1);
  }
})();
