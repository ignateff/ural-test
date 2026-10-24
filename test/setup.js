import "@testing-library/jest-dom/vitest";

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// JSDOM пока не реализует top layer и методы нативного dialog. Это только
// браузерный API для рендера; модальность, Escape и trap фокуса проверяет Chrome.
if (globalThis.HTMLDialogElement && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
    // Нативный dialog сам получает промежуточный фокус при клике на label.
    // JSDOM/user-event иначе выбирают ближайший tabindex на фоне (main).
    this.setAttribute("tabindex", "-1");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
}
