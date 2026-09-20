document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const authScreen = $("#authScreen");
  const dashboard = $("#dashboard");
  const loginForm = $("#loginForm");
  const loginPassword = $("#loginPassword");
  const loginButton = $("#loginButton");
  const authStatus = $("#authStatus");

  const waitlistBody = $("#waitlistBody");
  const totalCount = $("#totalCount");
  const selectAll = $("#selectAll");
  const selectedCount = $("#selectedCount");
  const selectionBar = $("#selectionBar");

  const composerModal = $("#composerModal");
  const composerForm = $("#composerForm");
  const closeComposer = $("#closeComposer");
  const recipientCount = $("#recipientCount");
  const sendButton = $("#sendButton");
  const composerStatus = $("#composerStatus");

  const historyList = $("#historyList");
  const refreshButton = $("#refreshButton");
  const exportButton = $("#exportButton");
  const logoutButton = $("#logoutButton");

  let waitlist = [];
  const selectedEmails = new Set();

  function showStatus(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.className = `status ${type}`;
    element.classList.remove("hidden");
  }

  function hideStatus(element) {
    element?.classList.add("hidden");
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(
        data?.error || `Request failed (${response.status}).`
      );
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function setAuthenticated(isAuthenticated) {
    authScreen?.classList.toggle("hidden", isAuthenticated);
    dashboard?.classList.toggle("hidden", !isAuthenticated);

    if (isAuthenticated) {
      loadAll();
    }
  }

  async function checkSession() {
    try {
      await api("/api/admin/session");
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    }
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = loginPassword?.value || "";
    if (!password) {
      showStatus(authStatus, "Enter your admin password.");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Authenticating…";
    hideStatus(authStatus);

    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      loginForm.reset();
      setAuthenticated(true);
    } catch (error) {
      showStatus(authStatus, error.message);
      loginPassword?.select();
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Enter command center";
    }
  });

  async function loadWaitlist() {
    const data = await api("/api/admin/waitlist");
    waitlist = Array.isArray(data.data) ? data.data : [];

    totalCount.textContent = String(waitlist.length);
    renderWaitlist();
  }

  function renderWaitlist() {
    if (!waitlistBody) return;

    if (!waitlist.length) {
      waitlistBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:70px 20px;color:#777">
            No waitlist entries yet.
          </td>
        </tr>
      `;
      return;
    }

    waitlistBody.innerHTML = waitlist
      .map((user) => {
        const email = escapeAttribute(user.email);
        const checked = selectedEmails.has(user.email) ? "checked" : "";
        const name = escapeHtml(user.full_name || "Guest");
        const joined = user.created_at
          ? new Date(user.created_at).toLocaleString()
          : "—";

        return `
          <tr data-email="${email}">
            <td>
              <input
                class="check row-check"
                type="checkbox"
                value="${email}"
                ${checked}
                aria-label="Select ${name}">
            </td>
            <td>${name}</td>
            <td>${escapeHtml(user.email)}</td>
            <td style="text-align:right;color:#777;font-size:12px">${escapeHtml(joined)}</td>
          </tr>
        `;
      })
      .join("");

    $$(".row-check").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedEmails.add(checkbox.value);
        } else {
          selectedEmails.delete(checkbox.value);
        }

        syncSelectionUI();
      });
    });

    $$("tbody tr[data-email]").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (event.target instanceof HTMLInputElement) return;

        const checkbox = row.querySelector(".row-check");
        if (!checkbox) return;

        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      });
    });

    syncSelectionUI();
  }

  function syncSelectionUI() {
    selectedCount.textContent = String(selectedEmails.size);
    recipientCount.textContent = String(selectedEmails.size);

    selectionBar?.classList.toggle(
      "visible",
      selectedEmails.size > 0
    );

    const boxes = $$(".row-check");
    if (selectAll) {
      selectAll.checked =
        boxes.length > 0 &&
        boxes.every((box) => box.checked);
      selectAll.indeterminate =
        boxes.some((box) => box.checked) &&
        !selectAll.checked;
    }
  }

  selectAll?.addEventListener("change", () => {
    const checked = selectAll.checked;

    $$(".row-check").forEach((box) => {
      box.checked = checked;

      if (checked) {
        selectedEmails.add(box.value);
      } else {
        selectedEmails.delete(box.value);
      }
    });

    syncSelectionUI();
  });

  $("#composeButton")?.addEventListener("click", () => {
    if (!selectedEmails.size) return;
    recipientCount.textContent = String(selectedEmails.size);
    composerModal.classList.remove("hidden");
  });

  closeComposer?.addEventListener("click", () => {
    composerModal.classList.add("hidden");
  });

  composerModal?.addEventListener("click", (event) => {
    if (event.target === composerModal) {
      composerModal.classList.add("hidden");
    }
  });

  composerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedEmails.size) {
      showStatus(composerStatus, "Select at least one recipient.");
      return;
    }

    const subject = $("#emailSubject").value.trim();
    const html = $("#emailBody").value.trim();

    sendButton.disabled = true;
    sendButton.textContent = "Sending…";
    hideStatus(composerStatus);

    try {
      const data = await api("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          subject,
          html,
          selectedEmails: [...selectedEmails],
        }),
      });

      showStatus(
        composerStatus,
        data.warning ||
          `Sent to ${data.sentCount} recipient${data.sentCount === 1 ? "" : "s"}.`,
        data.warning ? "error" : "success"
      );

      composerForm.reset();
      await loadHistory();
    } catch (error) {
      showStatus(composerStatus, error.message);
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "Send via Resend";
    }
  });

  async function loadHistory() {
    const data = await api("/api/admin/notifications");
    const history = Array.isArray(data.data) ? data.data : [];

    if (!history.length) {
      historyList.innerHTML = `<div class="small">No notifications sent yet.</div>`;
      return;
    }

    historyList.innerHTML = history
      .map((item) => {
        const sent = Number(item.sent_count || 0);
        const failed = Number(item.failed_count || 0);

        return `
          <div class="history-item">
            <div>
              <strong>${escapeHtml(item.subject)}</strong>
              <div class="small">
                ${escapeHtml(
                  item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "—"
                )}
              </div>
            </div>
            <div class="small">
              ${sent} sent${failed ? ` · ${failed} failed` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function loadAll() {
    try {
      await Promise.all([loadWaitlist(), loadHistory()]);
    } catch (error) {
      if (error.status === 401) {
        setAuthenticated(false);
        return;
      }

      console.error(error);
    }
  }

  refreshButton?.addEventListener("click", async () => {
    refreshButton.disabled = true;
    try {
      await loadAll();
    } finally {
      refreshButton.disabled = false;
    }
  });

  exportButton?.addEventListener("click", () => {
    window.location.href = "/api/admin/export";
  });

  logoutButton?.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch {
      // Clear the UI even if the network request fails.
    }

    selectedEmails.clear();
    setAuthenticated(false);
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  checkSession();
});
