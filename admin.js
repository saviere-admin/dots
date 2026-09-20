document.addEventListener("DOMContentLoaded", () => {
    const REQUIRED_PWD = "Saviere@798959885#";
    let activePwd = null;
    let selectedEmails = new Set();
    let waitlistData = [];

    const authModal = document.getElementById("authModal");
    const pwdForm = document.getElementById("pwdForm");
    const gitForm = document.getElementById("gitForm");
    const authError = document.getElementById("authError");
    const dashboardView = document.getElementById("dashboardView");
    
    const sPwd = sessionStorage.getItem("dots_admin_pwd");
    const sGit = sessionStorage.getItem("dots_admin_git");
    if (sPwd === REQUIRED_PWD && sGit) {
        activePwd = sPwd;
        unlockSystem(sGit);
    }

    function showError(msg) {
        if(!authError) return;
        authError.innerHTML = msg;
        authError.classList.remove("hidden");
    }

    if(pwdForm) {
        pwdForm.addEventListener("submit", (e) => {
            e.preventDefault(); 
            const val = document.getElementById("sysPwd")?.value.trim();
            
            if (val === REQUIRED_PWD) {
                activePwd = val;
                authError.classList.add("hidden");
                pwdForm.classList.replace("block", "hidden");
                gitForm.classList.replace("hidden", "block");
            } else {
                showError("Invalid System Password.");
                document.getElementById("sysPwd").value = "";
            }
        });
    }

    if(gitForm) {
        gitForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 
            const gitToken = document.getElementById("gitToken")?.value.trim();
            const btn = document.getElementById("btnGit");
            
            if (!gitToken.startsWith("ghp_") && !gitToken.startsWith("github_pat_")) {
                showError("<strong>Format Error:</strong> You must paste the actual 40-character secret key that starts with <code>ghp_</code>.");
                return;
            }

            btn.textContent = "Verifying Authority...";
            btn.disabled = true;
            authError.classList.add("hidden");

            try {
                const res = await fetch("/api/admin/waitlist", {
                    headers: { "X-Admin-Password": activePwd, "X-GitHub-Token": gitToken }
                });
                const data = await res.json();
                
                if (!res.ok) throw new Error(data.error || "GitHub verification failed.");

                sessionStorage.setItem("dots_admin_pwd", activePwd);
                sessionStorage.setItem("dots_admin_git", gitToken);
                unlockSystem(gitToken);

            } catch (err) {
                showError(`<strong>Auth Failed:</strong> ${err.message}`);
                btn.textContent = "Connect Database";
                btn.disabled = false;
            }
        });
    }

    function unlockSystem(gitToken) {
        document.body.classList.remove("items-center", "justify-center");
        if(authModal) authModal.classList.add("hidden");
        if(dashboardView) dashboardView.classList.remove("hidden");
        fetchWaitlist(gitToken);
    }

    async function fetchWaitlist(gitToken) {
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: { "X-Admin-Password": activePwd, "X-GitHub-Token": gitToken }
            });
            const { data } = await res.json();
            waitlistData = data;
            
            const countEl = document.getElementById("totalCount");
            if(countEl) countEl.textContent = data.length;
            
            const tbody = document.getElementById("waitlistBody");
            if(tbody) {
                tbody.innerHTML = waitlistData.map(u => `
                    <tr class="hover:bg-white/5 transition-colors cursor-pointer row-select" data-email="${u.email}">
                        <td class="px-6 py-4"><input type="checkbox" class="custom-checkbox row-check" value="${u.email}"></td>
                        <td class="px-6 py-4 font-medium text-white">${u.email}</td>
                        <td class="px-6 py-4 text-gray-400 text-xs text-right">${new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                `).join('');

                document.querySelectorAll('.row-select').forEach(row => {
                    row.addEventListener('click', (e) => {
                        if(e.target.type !== 'checkbox') {
                            const cb = row.querySelector('.row-check');
                            cb.checked = !cb.checked;
                            handleSelection(cb);
                        }
                    });
                });

                document.querySelectorAll('.row-check').forEach(cb => {
                    cb.addEventListener('change', (e) => handleSelection(e.target));
                });
            }
        } catch (e) { console.error("Database sync failed", e); }
    }

    const selectionActionBar = document.getElementById("selectionActionBar");
    const composerPanel = document.getElementById("composerPanel");

    const selectAllBtn = document.getElementById("selectAll");
    if(selectAllBtn) {
        selectAllBtn.addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.row-check').forEach(cb => {
                cb.checked = isChecked;
                if (isChecked) selectedEmails.add(cb.value);
                else selectedEmails.delete(cb.value);
            });
            updateActionBar();
        });
    }

    function handleSelection(checkbox) {
        if (checkbox.checked) selectedEmails.add(checkbox.value);
        else selectedEmails.delete(checkbox.value);
        updateActionBar();
    }

    function updateActionBar() {
        const selCount = document.getElementById("selectedCount");
        const recCount = document.getElementById("recipientCountLabel");
        if(selCount) selCount.textContent = selectedEmails.size;
        if(recCount) recCount.textContent = selectedEmails.size;
        
        if (selectedEmails.size > 0) {
            selectionActionBar?.classList.remove("translate-y-24");
        } else {
            selectionActionBar?.classList.add("translate-y-24");
            composerPanel?.classList.add("hidden");
        }
    }

    const composeBtn = document.getElementById("composeBtn");
    if(composeBtn) {
        composeBtn.addEventListener("click", () => composerPanel.classList.remove("hidden"));
    }
    
    const closeBtn = document.getElementById("closeComposerBtn");
    if(closeBtn) {
        closeBtn.addEventListener("click", () => composerPanel.classList.add("hidden"));
    }

    const notifyForm = document.getElementById("notifyForm");
    if (notifyForm) {
        notifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const subject = document.getElementById("emailSubject").value;
            const html = document.getElementById("emailBody").value;
            const btn = document.getElementById("sendBtn");
            const statusBox = document.getElementById("notifyStatus");

            btn.disabled = true; 
            btn.textContent = "Dispatching Payload...";
            statusBox.classList.add("hidden");

            try {
                const res = await fetch("/api/admin/notifications", {
                    method: "POST",
                    headers: {
                        "X-Admin-Password": activePwd,
                        "X-GitHub-Token": sessionStorage.getItem("dots_admin_git"),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ subject, html, selectedEmails: Array.from(selectedEmails) })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                statusBox.textContent = `Payload delivered to ${data.count} targets.`;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-green-900/30 text-green-400 border border-green-500/20 block";
                notifyForm.reset();
            } catch (err) {
                statusBox.textContent = err.message;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-red-900/30 text-red-400 border border-red-500/20 block";
            } finally {
                btn.disabled = false; btn.textContent = "Dispatch to Targets";
            }
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.clear(); location.reload();
        });
    }
});