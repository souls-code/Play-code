/* Todo app (vanilla JS) */

const STORAGE_KEY = "todo_app_v1";

/** @typedef {{id:string,text:string,completed:boolean,createdAt:number,updatedAt:number}} Todo */

/** @returns {string} */
function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

/** @param {unknown} value @returns {Todo | null} */
function coerceTodo(value) {
  if (!isRecord(value)) return null;
  const { id, text, completed, createdAt, updatedAt } = value;
  if (typeof id !== "string") return null;
  if (typeof text !== "string") return null;
  if (typeof completed !== "boolean") return null;
  if (typeof createdAt !== "number") return null;
  if (typeof updatedAt !== "number") return null;
  return { id, text, completed, createdAt, updatedAt };
}

/** @returns {{todos: Todo[]}} */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { todos: [] };
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.todos)) return { todos: [] };
    const todos = parsed.todos.map(coerceTodo).filter(Boolean);
    return { todos };
  } catch {
    return { todos: [] };
  }
}

/** @param {{todos: Todo[]}} state */
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos: state.todos }));
}

/** @param {number} ms */
function formatTimestamp(ms) {
  const d = new Date(ms);
  const fmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return fmt.format(d);
}

function plural(n, one, many) {
  return n === 1 ? one : many;
}

const $ = (sel) => /** @type {HTMLElement} */ (document.querySelector(sel));

const els = {
  form: /** @type {HTMLFormElement} */ ($("#create-form")),
  input: /** @type {HTMLInputElement} */ ($("#new-todo")),
  addBtn: /** @type {HTMLButtonElement} */ ($("#add-btn")),
  list: /** @type {HTMLUListElement} */ ($("#todo-list")),
  template: /** @type {HTMLTemplateElement} */ ($("#todo-item-template")),
  itemsLeft: $("#items-left"),
  empty: $("#empty-state"),
  toggleAllBtn: /** @type {HTMLButtonElement} */ ($("#toggle-all-btn")),
  clearCompletedBtn: /** @type {HTMLButtonElement} */ ($("#clear-completed-btn")),
  filterButtons: /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll(".filter")),
  search: /** @type {HTMLInputElement} */ ($("#search-input")),
};

const state = {
  todos: loadState().todos,
  filter: /** @type {"all"|"active"|"completed"} */ ("all"),
  query: "",
  editingId: /** @type {string|null} */ (null),
};

function persist() {
  saveState({ todos: state.todos });
}

/** @param {string} text */
function addTodo(text) {
  const now = Date.now();
  /** @type {Todo} */
  const todo = {
    id: uid(),
    text,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
  state.todos = [todo, ...state.todos];
  persist();
  render();
}

/** @param {string} id */
function deleteTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  if (state.editingId === id) state.editingId = null;
  persist();
  render();
}

/** @param {string} id @param {boolean} completed */
function setCompleted(id, completed) {
  const now = Date.now();
  state.todos = state.todos.map((t) => (t.id === id ? { ...t, completed, updatedAt: now } : t));
  persist();
  render();
}

/** @param {string} id @param {string} text */
function updateText(id, text) {
  const now = Date.now();
  state.todos = state.todos.map((t) => (t.id === id ? { ...t, text, updatedAt: now } : t));
  persist();
  render();
}

function toggleAll() {
  const anyActive = state.todos.some((t) => !t.completed);
  const now = Date.now();
  state.todos = state.todos.map((t) => ({ ...t, completed: anyActive, updatedAt: now }));
  persist();
  render();
}

function clearCompleted() {
  const before = state.todos.length;
  state.todos = state.todos.filter((t) => !t.completed);
  if (state.todos.length !== before) persist();
  render();
}

/** @param {Todo} t */
function matchesFilter(t) {
  if (state.filter === "active") return !t.completed;
  if (state.filter === "completed") return t.completed;
  return true;
}

/** @param {Todo} t */
function matchesQuery(t) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  return t.text.toLowerCase().includes(q);
}

function setFilter(next) {
  state.filter = next;
  for (const btn of els.filterButtons) {
    const active = btn.dataset.filter === next;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
  render();
}

function beginEdit(id) {
  state.editingId = id;
  render();
  const li = els.list.querySelector(`li[data-id="${CSS.escape(id)}"]`);
  const input = li?.querySelector("input[data-role='edit']");
  if (input && input instanceof HTMLInputElement) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function cancelEdit() {
  state.editingId = null;
  render();
}

/** @param {string} id @param {string} nextText */
function commitEdit(id, nextText) {
  const text = nextText.trim();
  state.editingId = null;
  if (!text) {
    deleteTodo(id);
    return;
  }
  updateText(id, text);
}

function render() {
  // Header/meta
  const activeCount = state.todos.filter((t) => !t.completed).length;
  els.itemsLeft.textContent = `${activeCount} ${plural(activeCount, "tâche restante", "tâches restantes")}`;

  const hasCompleted = state.todos.some((t) => t.completed);
  els.clearCompletedBtn.disabled = !hasCompleted;
  els.toggleAllBtn.disabled = state.todos.length === 0;

  // List
  const visible = state.todos.filter((t) => matchesFilter(t) && matchesQuery(t));
  els.empty.hidden = visible.length !== 0;

  const frag = document.createDocumentFragment();

  for (const t of visible) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    /** @type {HTMLLIElement} */
    const li = node;
    li.dataset.id = t.id;
    li.classList.toggle("is-completed", t.completed);

    const checkbox = li.querySelector(".toggle");
    if (checkbox && checkbox instanceof HTMLInputElement) {
      checkbox.checked = t.completed;
      checkbox.setAttribute("aria-label", t.completed ? "Marquer comme active" : "Marquer comme terminée");
    }

    const textEl = li.querySelector(".text");
    const badge = li.querySelector(".badge");
    const ts = li.querySelector(".timestamp");

    if (ts) {
      const created = formatTimestamp(t.createdAt);
      const updated = formatTimestamp(t.updatedAt);
      ts.textContent = t.updatedAt !== t.createdAt ? `Créée ${created} · Modifiée ${updated}` : `Créée ${created}`;
    }

    if (badge) badge.toggleAttribute("hidden", !t.completed);

    if (state.editingId === t.id) {
      const edit = document.createElement("input");
      edit.type = "text";
      edit.value = t.text;
      edit.maxLength = 200;
      edit.dataset.role = "edit";
      edit.setAttribute("aria-label", "Modifier la tâche");
      edit.style.padding = "10px 12px";
      edit.style.borderRadius = "14px";
      edit.style.border = "1px solid rgba(255, 255, 255, 0.18)";
      edit.style.background = "rgba(0, 0, 0, 0.32)";
      edit.style.color = "rgba(255, 255, 255, 0.92)";

      edit.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitEdit(t.id, edit.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEdit();
        }
      });
      edit.addEventListener("blur", () => {
        // blur commit (si l’utilisateur clique ailleurs)
        if (state.editingId === t.id) commitEdit(t.id, edit.value);
      });

      if (textEl) {
        textEl.replaceWith(edit);
      }
    } else {
      if (textEl) {
        textEl.textContent = t.text;
        textEl.title = "Double-cliquez pour éditer";
      }
    }

    frag.appendChild(li);
  }

  els.list.replaceChildren(frag);
}

// Events
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
  addTodo(text);
  els.input.value = "";
  els.input.focus();
});

els.toggleAllBtn.addEventListener("click", toggleAll);
els.clearCompletedBtn.addEventListener("click", clearCompleted);

for (const btn of els.filterButtons) {
  btn.addEventListener("click", () => {
    const next = btn.dataset.filter;
    if (next === "all" || next === "active" || next === "completed") setFilter(next);
  });
}

els.search.addEventListener("input", () => {
  state.query = els.search.value;
  render();
});

els.list.addEventListener("change", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.classList.contains("toggle")) return;
  const li = target.closest("li[data-id]");
  const id = li?.getAttribute("data-id");
  if (!id) return;
  setCompleted(id, target.checked);
});

els.list.addEventListener("dblclick", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const li = target.closest("li[data-id]");
  const id = li?.getAttribute("data-id");
  if (!id) return;
  if (target.classList.contains("text")) beginEdit(id);
});

els.list.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const button = target.closest("button[data-action]");
  if (!button) return;
  const action = button.getAttribute("data-action");
  const li = button.closest("li[data-id]");
  const id = li?.getAttribute("data-id");
  if (!id) return;

  if (action === "delete") deleteTodo(id);
  if (action === "edit") beginEdit(id);
});

// Boot
render();
