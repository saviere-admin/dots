document.addEventListener("DOMContentLoaded", () => {
  const state = {
    contacts: [],
    selected: new Set(),
    notifications: []
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const authView = $("#authView");
  const dashboardView = $("#dashboardView");
  const authForm = $("#authForm");
  const authError = $("#authError");
  const authButton = $("#authButton");

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function showAuthError(message) {
    if (!authError) return;
    authError.textContent = message;
    authError.classList.remove("hidden");
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    button.dataset.originalLabel ||= button.textContent;
    button.textContent = busy ? label : button.dataset.originalLabel;
  }

  function setDashboard(visible) {
    authView?.classList.toggle("hidden", visible);
    dashboardView?.classList.toggle("hidden", !visible);
    document.body.classList.toggle("dashboard-open", visible);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const type = response.headers.get("content-type") || "";
    const payload = type.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(payload?.error || "Request failed.");
    }

    return payload;
  }

  async function authenticate(password, githubToken) {
    return api("/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password, githubToken })
    });
  }

  async function loadDashboard() {
    const [waitlist, notifications] = await Promise.all([
      api("/api/admin/waitlist"),
      api("/api/admin/notifications")
    ]);

    state.contacts = waitlist.data || [];
    state.notifications = notifications.data || [];

    renderStats();
    renderContacts();
    renderNotifications();
  }

  function renderStats() {
    const total = state.contacts.length;
    const selected = state.selected.size;

    $("#totalCount") && ($("#totalCount").textContent = total);
    $("#selectedCount") && ($("#selectedCount").textContent = selected);
    $("#recipientCount") && ($("#recipientCount").textContent = selected);
    $("#notificationCount") && ($("#notificationCount").textContent = state.notifications.length);
  }

  function renderContacts() {
    const tbody = $("#waitlistBody");
    const empty = $("#waitlistEmpty");

    if (!tbody) return;

    if (!state.contacts.length) {
      tbody.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }

    empty?.classList.add("hidden");

    tbody.innerHTML = state.contacts.map(contact => {
      const email = escapeHtml(contact.email);
      const name = escapeHtml(contact.full_name || "Guest");
      const date = contact.created_at
        ? new Date(contact.created_at).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
          })
        : "—";
      const checked = state.selected.has(contact.email) ? "checked" : "";

      return `
        <tr class="contact-row ${checked ? "is-selected" : ""}" data-email="${email}">
          <td class="cell-check">
            <input class="contact-check" type="checkbox" value="${email}" ${checked} aria-label="Select ${name}">
          </td>
          <td class="cell-name">${name}</td>
          <td class="cell-email">${email}</td>
          <td class="cell-date">${escapeHtml(date)}</td>
        </tr>
      `;
    }).join("");

    $$(".contact-row").forEach(row => {
      row.addEventListener("click", event => {
        if (event.target.closest("input")) return;
        const checkbox = row.querySelector(".contact-check");
        checkbox.checked = !checkbox.checked;
        toggleSelection(checkbox);
      });
    });

    $$(".contact-check").forEach(checkbox => {
      checkbox.addEventListener("change", () => toggleSelection(checkbox));
    });

    syncSelectAll();
  }

  function toggleSelection(checkbox) {
    if (checkbox.checked) state.selected.add(checkbox.value);
    else state.selected.delete(checkbox.value);

    checkbox.closest(".contact-row")?.classList.toggle("is-selected", checkbox.checked);
    renderStats();
    updateComposerBar();
  }

  function syncSelectAll() {
    const selectAll = $("#selectAll");
    if (!selectAll) return;

    const boxes = $$(".contact-check");
    const checked = boxes.filter(box => box.checked).length;

    selectAll.checked = boxes.length > 0 && checked === boxes.length;
    selectAll.indeterminate = checked > 0 && checked < boxes.length;
  }

  function updateComposerBar() {
    const bar = $("#selectionBar");
    if (!bar) return;

    const active = state.selected.size > 0;
    bar.classList.toggle("is-visible", active);
  }

  function openComposer() {
    if (!state.selected.size) return;
    $("#composerModal")?.classList.add("is-open");
    document.body.classList.add("modal-open");
    $("#emailSubject")?.focus();
  }

  function closeComposer() {
    $("#composerModal")?.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  }

  function renderNotifications() {
    const list = $("#notificationList");
    const empty = $("#notificationEmpty");
    if (!list) return;

    if (!state.notifications.length) {
      list.innerHTML = "";
      empty?.classList.remove("hidden");
      return;
    }

    empty?.classList.add("hidden");

    list.innerHTML = state.notifications.map(item => `
      <article class="notification-item">
        <div>
          <strong>${escapeHtml(item.subject)}</strong>
          <p>${escapeHtml(new Date(item.created_at).toLocaleString())}</p>
        </div>
        <div class="notification-meta">
          <span>${item.sent_count} sent</span>
          ${item.failed_count ? `<span class="failed">${item.failed_count} failed</span>` : ""}
        </div>
      </article>
    `).join("");
  }

  $("#selectAll")?.addEventListener("change", event => {
    const checked = event.target.checked;

    $$(".contact-check").forEach(box => {
      box.checked = checked;
      if (checked) state.selected.add(box.value);
      else state.selected.delete(box.value);
      box.closest(".contact-row")?.classList.toggle("is-selected", checked);
    });

    renderStats();
    updateComposerBar();
  });

  $("#composeButton")?.addEventListener("click", openComposer);
  $("#closeComposer")?.addEventListener("click", closeComposer);

  $("#composerModal")?.addEventListener("click", event => {
    if (event.target.id === "composerModal") closeComposer();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeComposer();
  });

  $("#authForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const password = $("#adminPassword")?.value || "";
    const githubToken = $("#githubToken")?.value.trim() || "";

    authError?.classList.add("hidden");
    setBusy(authButton, true, "Verifying…");

    try {
      await authenticate(password, githubToken);
      $("#adminPassword").value = "";
      $("#githubToken").value = "";
      setDashboard(true);
      await loadDashboard();
    } catch (error) {
      showAuthError(error.message);
    } finally {
      setBusy(authButton, false, "Verifying…");
    }
  });

  $("#notifyForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("#sendButton");
    const status = $("#notifyStatus");
    const subject = $("#emailSubject")?.value.trim() || "";
    const html = $("#emailBody")?.value.trim() || "";

    status?.classList.add("hidden");
    setBusy(button, true, "Sending…");

    try {
      const result = await api("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          subject,
          html,
          selectedEmails: [...state.selected]
        })
      });

      if (status) {
        status.textContent = result.failed
          ? `${result.count} sent · ${result.failed} failed.`
          : `${result.count} emails sent successfully.`;
        status.className = "status success";
      }

      state.selected.clear();
      $("#notifyForm").reset();
      closeComposer();
      await loadDashboard();
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.className = "status error";
      }
      status?.classList.remove("hidden");
    } finally {
      setBusy(button, false, "Sending…");
    }
  });

  $("#exportButton")?.addEventListener("click", async () => {
    const button = $("#exportButton");
    setBusy(button, true, "Preparing…");

    try {
      const response = await fetch("/api/admin/waitlist", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "text/csv" },
        body: JSON.stringify({ format: "csv" })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dots-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(button, false, "Preparing…");
    }
  });

  $("#refreshButton")?.addEventListener("click", async () => {
    const button = $("#refreshButton");
    setBusy(button, true, "Refreshing…");

    try {
      await loadDashboard();
    } catch (error) {
      alert(error.message);
      if (/Authentication required/i.test(error.message)) setDashboard(false);
    } finally {
      setBusy(button, false, "Refreshing…");
    }
  });

  $("#logoutButton")?.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch {
      // Session is cleared client-side regardless.
    }
    state.selected.clear();
    setDashboard(false);
    $("#adminPassword")?.focus();
  });

  // Session discovery: protected endpoint tells us whether a session exists.
  loadDashboard()
    .then(() => setDashboard(true))
    .catch(() => setDashboard(false));
});
