(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const state = {
    waitlist: [],
    history: [],
    selectedEmails: new Set(),
    currentView: "overview"
  };

  const LOGO_URL =
    "https://usedots.in/brand/logos/dh/DotsTBBTWoS.png";

  const escapeHtml = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function showToast(message, type = "") {
    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    window.clearTimeout(showToast.timer);

    showToast.timer = window.setTimeout(() => {
      toast.className = "toast";
    }, 3500);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      showLogin();
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Request failed."
      );
    }

    return data;
  }

  function showLogin() {
    $("#loginView").hidden = false;
    $("#appView").hidden = true;
  }

  function showApp() {
    $("#loginView").hidden = true;
    $("#appView").hidden = false;
  }

  async function checkSession() {
    try {
      const data = await api("/api/admin/session", {
        method: "GET"
      });

      if (data.authenticated) {
        showApp();
        await loadDashboard();
      } else {
        showLogin();
      }
    } catch {
      showLogin();
    }
  }

  async function login(password) {
    const button = $("#loginButton");
    const error = $("#loginError");

    error.hidden = true;
    button.disabled = true;
    button.querySelector("span").textContent = "Signing in…";

    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          password
        })
      });

      $("#password").value = "";

      showApp();

      await loadDashboard();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.querySelector("span").textContent = "Sign in";
    }
  }

  async function logout() {
    try {
      await api("/api/admin/logout", {
        method: "POST"
      });
    } catch {
      // The session may already have expired.
    }

    state.waitlist = [];
    state.history = [];
    state.selectedEmails.clear();

    showLogin();
  }

  async function loadDashboard() {
    await Promise.all([
      loadWaitlist(),
      loadHistory()
    ]);

    renderEverything();
  }

  async function loadWaitlist() {
    const data = await api("/api/admin/waitlist", {
      method: "GET"
    });

    state.waitlist = Array.isArray(data.data)
      ? data.data
      : [];
  }

  async function loadHistory() {
    try {
      const data = await api("/api/admin/notifications", {
        method: "GET"
      });

      state.history = Array.isArray(data.data)
        ? data.data
        : [];
    } catch {
      state.history = [];
    }
  }

  function renderEverything() {
    renderStats();
    renderRecent();
    renderWaitlist();
    renderSelectionList();
    renderHistory();
    updateRecipientCounts();
    updatePreview();
  }

  function renderStats() {
    const total = state.waitlist.length;

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const sevenDaysAgo = new Date(
      now.getTime() -
      7 * 24 * 60 * 60 * 1000
    );

    const today = state.waitlist.filter(row => {
      const date = new Date(row.created_at);
      return date >= startOfToday;
    }).length;

    const week = state.waitlist.filter(row => {
      const date = new Date(row.created_at);
      return date >= sevenDaysAgo;
    }).length;

    $("#statTotal").textContent = total;
    $("#statToday").textContent = today;
    $("#statWeek").textContent = week;
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    ).format(date);
  }

  function renderRecent() {
    const container = $("#recentList");

    const recent = state.waitlist.slice(0, 6);

    if (!recent.length) {
      container.innerHTML = `
        <div class="empty-state">
          No subscribers yet.
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(row => `
      <div class="recent-row">
        <div>
          <strong>${escapeHtml(row.name || "Subscriber")}</strong>
          <span>${escapeHtml(row.email)}</span>
        </div>

        <time>${escapeHtml(formatDate(row.created_at))}</time>
      </div>
    `).join("");
  }

  function getFilteredWaitlist() {
    const query = (
      $("#waitlistSearch")?.value ||
      ""
    ).trim().toLowerCase();

    if (!query) {
      return state.waitlist;
    }

    return state.waitlist.filter(row =>
      String(row.name || "")
        .toLowerCase()
        .includes(query) ||
      String(row.email || "")
        .toLowerCase()
        .includes(query)
    );
  }

  function renderWaitlist() {
    const body = $("#waitlistBody");
    const empty = $("#waitlistEmpty");

    const rows = getFilteredWaitlist();

    body.innerHTML = "";

    if (!rows.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    rows.forEach(row => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(row.name || "—")}</strong>
        </td>

        <td>
          ${escapeHtml(row.email)}
        </td>

        <td>
          <span class="source-pill">
            ${escapeHtml(row.source || "website")}
          </span>
        </td>

        <td>
          ${escapeHtml(formatDate(row.created_at))}
        </td>

        <td class="actions-cell">
          <button
            class="danger-text"
            type="button"
            data-delete-email="${escapeHtml(row.email)}"
          >
            Remove
          </button>
        </td>
      `;

      body.appendChild(tr);
    });
  }

  function renderSelectionList() {
    const container = $("#selectionList");

    container.innerHTML = "";

    if (!state.waitlist.length) {
      container.innerHTML = `
        <div class="empty-state">
          There are no subscribers to select.
        </div>
      `;
      return;
    }

    state.waitlist.forEach(row => {
      const email = String(row.email || "")
        .trim()
        .toLowerCase();

      const label = document.createElement("label");
      label.className = "selection-row";

      label.innerHTML = `
        <input
          type="checkbox"
          value="${escapeHtml(email)}"
          ${state.selectedEmails.has(email) ? "checked" : ""}
        >

        <span>
          <strong>${escapeHtml(row.name || "Subscriber")}</strong>
          <small>${escapeHtml(email)}</small>
        </span>
      `;

      const checkbox = label.querySelector("input");

      checkbox.addEventListener("change", event => {
        if (event.target.checked) {
          state.selectedEmails.add(email);
        } else {
          state.selectedEmails.delete(email);
        }

        updateRecipientCounts();
      });

      container.appendChild(label);
    });
  }

  function updateRecipientCounts() {
    $("#allRecipientCount").textContent =
      `${state.waitlist.length} subscriber${state.waitlist.length === 1 ? "" : "s"}`;

    $("#selectedRecipientCount").textContent =
      `${state.selectedEmails.size} selected`;
  }

  function renderHistory() {
    const body = $("#historyBody");
    const empty = $("#historyEmpty");

    body.innerHTML = "";

    if (!state.history.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    state.history.forEach(row => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <strong>${escapeHtml(row.subject || "—")}</strong>
        </td>

        <td class="success-number">
          ${Number(row.sent_count || 0)}
        </td>

        <td class="failed-number">
          ${Number(row.failed_count || 0)}
        </td>

        <td>
          ${escapeHtml(formatDate(row.created_at))}
        </td>
      `;

      body.appendChild(tr);
    });
  }

  function currentRecipientMode() {
    return document.querySelector(
      'input[name="recipientMode"]:checked'
    )?.value || "all";
  }

  function updatePreview() {
    const subject =
      $("#emailSubject")?.value.trim() ||
      "A note from dots.";

    const message =
      $("#emailMessage")?.value.trim() ||
      "Your message will appear here.";

    const ctaText =
      $("#ctaText")?.value.trim();

    const ctaUrl =
      $("#ctaUrl")?.value.trim();

    const body = escapeHtml(message)
      .replace(/\r?\n/g, "<br>");

    const cta =
      ctaText && ctaUrl
        ? `
          <p style="margin:28px 0 0;">
            <span
              style="
                display:inline-block;
                background:#a80f2d;
                color:#fff;
                padding:13px 20px;
                border-radius:999px;
                font-weight:700;
                font-size:14px;
              "
            >
              ${escapeHtml(ctaText)}
            </span>
          </p>
        `
        : "";

    $("#emailPreview").innerHTML = `
      <div class="preview-email">
        <div class="preview-header">
          <img
            src="${LOGO_URL}"
            alt="dots."
          >
        </div>

        <div class="preview-content">
          <h4>${escapeHtml(subject)}</h4>

          <div class="preview-message">
            ${body}
          </div>

          ${cta}
        </div>

        <div class="preview-footer">
          <div>dots. — oral care, simplified.</div>
          <div>A brand by Saviere Group Private Limited.</div>
          <div>Unsubscribe</div>
          <div>© 2026 Saviere Group Private Limited.</div>
        </div>
      </div>
    `;
  }

  function setView(view) {
    state.currentView = view;

    const titles = {
      overview: "Overview",
      waitlist: "Waitlist",
      compose: "Send email",
      history: "History"
    };

    $("#pageTitle").textContent =
      titles[view] || "Overview";

    $$(".nav-item").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });

    $$(".view").forEach(section => {
      section.classList.toggle(
        "active",
        section.id === `view-${view}`
      );
    });

    $(".sidebar")?.classList.remove("open");
  }

  async function sendEmail() {
    const button = $("#sendEmailButton");
    const status = $("#sendStatus");

    const subject =
      $("#emailSubject").value.trim();

    const message =
      $("#emailMessage").value.trim();

    const ctaText =
      $("#ctaText").value.trim();

    const ctaUrl =
      $("#ctaUrl").value.trim();

    const mode = currentRecipientMode();

    if (!subject) {
      showToast("Add an email subject.", "error");
      return;
    }

    if (!message) {
      showToast("Write a message first.", "error");
      return;
    }

    if (mode === "selected" && !state.selectedEmails.size) {
      showToast("Select at least one subscriber.", "error");
      return;
    }

    if (
      ctaUrl &&
      !/^https:\/\//i.test(ctaUrl)
    ) {
      showToast("CTA URL must use HTTPS.", "error");
      return;
    }

    const confirmed = window.confirm(
      mode === "all"
        ? `Send this email to all ${state.waitlist.length} subscribers?`
        : `Send this email to ${state.selectedEmails.size} selected subscribers?`
    );

    if (!confirmed) {
      return;
    }

    button.disabled = true;
    button.textContent = "Sending…";
    status.textContent = "";

    try {
      const payload = {
        subject,
        message,
        ctaText,
        ctaUrl,
        allRecipients: mode === "all",
        selectedEmails:
          mode === "selected"
            ? [...state.selectedEmails]
            : []
      };

      const result = await api(
        "/api/admin/notifications",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      status.textContent =
        `Sent to ${result.sentCount || 0} subscriber` +
        `${result.sentCount === 1 ? "" : "s"}.`;

      showToast(
        result.failedCount
          ? `Sent with ${result.failedCount} failure(s).`
          : "Email sent successfully.",
        result.failedCount ? "error" : "success"
      );

      await loadHistory();
      renderHistory();

      $("#emailMessage").value = "";
      updatePreview();
    } catch (error) {
      status.textContent = error.message;
      showToast(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Send branded email";
    }
  }

  async function deleteSubscriber(email) {
    const confirmed = window.confirm(
      `Remove ${email} from the waitlist?`
    );

    if (!confirmed) return;

    try {
      await api("/api/admin/waitlist", {
        method: "DELETE",
        body: JSON.stringify({
          email
        })
      });

      state.selectedEmails.delete(email);

      await loadWaitlist();
      renderEverything();

      showToast(
        "Subscriber removed.",
        "success"
      );
    } catch (error) {
      showToast(
        error.message,
        "error"
      );
    }
  }

  function bindEvents() {
    $("#loginForm").addEventListener(
      "submit",
      event => {
        event.preventDefault();

        login(
          $("#password").value
        );
      }
    );

    $("#logoutButton").addEventListener(
      "click",
      logout
    );

    $("#refreshButton").addEventListener(
      "click",
      async () => {
        try {
          await loadDashboard();
          showToast("Dashboard refreshed.", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      }
    );

    $$(".nav-item").forEach(button => {
      button.addEventListener(
        "click",
        () => setView(button.dataset.view)
      );
    });

    $$("[data-view-target]").forEach(button => {
      button.addEventListener(
        "click",
        () => setView(button.dataset.viewTarget)
      );
    });

    $("#waitlistSearch").addEventListener(
      "input",
      renderWaitlist
    );

    $("#waitlistBody").addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-delete-email]"
          );

        if (!button) return;

        deleteSubscriber(
          button.dataset.deleteEmail
        );
      }
    );

    $("#mobileMenuButton").addEventListener(
      "click",
      () => {
        $(".sidebar")?.classList.toggle("open");
      }
    );

    $("#selectAllButton").addEventListener(
      "click",
      () => {
        state.waitlist.forEach(row => {
          const email = String(row.email || "")
            .trim()
            .toLowerCase();

          state.selectedEmails.add(email);
        });

        renderSelectionList();
        updateRecipientCounts();
      }
    );

    $$('input[name="recipientMode"]').forEach(
      radio => {
        radio.addEventListener(
          "change",
          () => {
            $("#selectionPanel").hidden =
              currentRecipientMode() !== "selected";
          }
        );
      }
    );

    [
      "#emailSubject",
      "#emailMessage",
      "#ctaText",
      "#ctaUrl"
    ].forEach(selector => {
      $(selector).addEventListener(
        "input",
        updatePreview
      );
    });

    $("#sendEmailButton").addEventListener(
      "click",
      sendEmail
    );
  }

  bindEvents();
  checkSession();
})();
