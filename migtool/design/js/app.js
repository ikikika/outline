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
})();
