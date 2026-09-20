document.addEventListener("DOMContentLoaded", () => {
    // 1. State & Constants
    const REQUIRED_PWD = "Saviere@798959885#";
    let activePwd = null;
    let selectedEmails = new Set();
    let waitlistData = [];

    // 2. DOM Elements
    const authModal = document.getElementById("authModal");
    const pwdForm = document.getElementById("pwdForm");
    const gitForm = document.getElementById("gitForm");
    const authError = document.getElementById("authError");
    const dashboardView = document.getElementById("dashboardView");
    
    // 3. Persistent Session Check
    const sPwd = sessionStorage.getItem("dots_admin_pwd");
    const sGit = sessionStorage.getItem("dots_admin_git");
    if (sPwd === REQUIRED_PWD && sGit) {
        activePwd = sPwd;
        unlockSystem(sGit);
    }

    function showError(msg) {
        authError.textContent = msg;
        authError.classList.remove("hidden");
    }

    // --- STEP 1: PASSWORD AUTHENTICATION ---
    pwdForm.addEventListener("submit", (e) => {
        e.preventDefault(); // STRICTLY PREVENTS PAGE RELOAD BUG
        const val = document.getElementById("sysPwd").value.trim();
        
        if (val === REQUIRED_PWD) {
            activePwd = val;
            authError.classList.add("hidden");
            // Swap Forms
            pwdForm.classList.replace("block", "hidden");
            gitForm.classList.replace("hidden", "block");
        } else {
            showError("Invalid System Password.");
            document.getElementById("sysPwd").value = "";
        }
    });

    // --- STEP 2: GITHUB PAT AUTHENTICATION ---
    gitForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // STRICTLY PREVENTS PAGE RELOAD BUG
        const gitToken = document.getElementById("gitToken").value.trim();
        const btn = document.getElementById("btnGit");
        
        btn.textContent = "Verifying Authority...";
        btn.disabled = true;
        authError.classList.add("hidden");

        try {
            // Ping the backend to verify the token is active and belongs to dots-company
            const res = await fetch("/api/admin/waitlist", {
                headers: { "X-Admin-Password": activePwd, "X-GitHub-Token": gitToken }
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "GitHub verification failed.");

            // Success! Save session and unlock dashboard.
            sessionStorage.setItem("dots_admin_pwd", activePwd);
            sessionStorage.setItem("dots_admin_git", gitToken);
            unlockSystem(gitToken);

        } catch (err) {
            showError(err.message);
            btn.textContent = "Connect Database";
            btn.disabled = false;
        }
    });

    // --- STEP 3: UNLOCK DASHBOARD ---
    function unlockSystem(gitToken) {
        document.body.classList.remove("items-center", "justify-center");
        authModal.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        fetchWaitlist(gitToken);
    }

    // --- STEP 4: FETCH WAITLIST DATA ---
    async function fetchWaitlist(gitToken) {
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: { "X-Admin-Password": activePwd, "X-GitHub-Token": gitToken }
            });
            const { data } = await res.json();
            waitlistData = data;
            document.getElementById("totalCount").textContent = data.length;
            renderTable();
        } catch (e) { 
            console.error("Failed to sync D1 database", e); 
        }
    }

    function renderTable() {
        const tbody = document.getElementById("waitlistBody");
        tbody.innerHTML = waitlistData.map(u => `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer row-select" data-email="${u.email}">
                <td class="px-6 py-4"><input type="checkbox" class="custom-checkbox row-check" value="${u.email}"></td>
                <td class="px-6 py-4 font-medium text-white">${u.email}</td>
                <td class="px-6 py-4 text-gray-400 text-xs text-right">${new Date(u.created_at).toLocaleString()}</td>
            </tr>
        `).join('');

        // Row Click Selection Logic
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

    // --- STEP 5: SELECTION & ACTION BAR LOGIC ---
    const selectionActionBar = document.getElementById("selectionActionBar");
    const composerPanel = document.getElementById("composerPanel");

    document.getElementById("selectAll").addEventListener("change", (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.row-check').forEach(cb => {
            cb.checked = isChecked;
            if (isChecked) selectedEmails.add(cb.value);
            else selectedEmails.delete(cb.value);
        });
        updateActionBar();
    });

    function handleSelection(checkbox) {
        if (checkbox.checked) selectedEmails.add(checkbox.value);
        else selectedEmails.delete(checkbox.value);
        updateActionBar();
    }

    function updateActionBar() {
        document.getElementById("selectedCount").textContent = selectedEmails.size;
        document.getElementById("recipientCountLabel").textContent = selectedEmails.size;
        if (selectedEmails.size > 0) {
            selectionActionBar.classList.remove("translate-y-24");
        } else {
            selectionActionBar.classList.add("translate-y-24");
            composerPanel.classList.add("hidden");
        }
    }

    // Composer Toggles
    document.getElementById("composeBtn").addEventListener("click", () => {
        composerPanel.classList.remove("hidden");
    });
    document.getElementById("closeComposerBtn").addEventListener("click", () => {
        composerPanel.classList.add("hidden");
    });

    // --- STEP 6: SEND BROADCAST VIA RESEND ---
    document.getElementById("notifyForm").addEventListener("submit", async (e) => {
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
                body: JSON.stringify({ 
                    subject, 
                    html, 
                    selectedEmails: Array.from(selectedEmails) 
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            statusBox.textContent = `Payload delivered to ${data.count} targets.`;
            statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-green-900/30 text-green-400 border border-green-500/20 block";
            document.getElementById("notifyForm").reset();
        } catch (err) {
            statusBox.textContent = err.message;
            statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-red-900/30 text-red-400 border border-red-500/20 block";
        } finally {
            btn.disabled = false; 
            btn.textContent = "Dispatch to Targets";
        }
    });

    // --- STEP 7: LOGOUT ---
    document.getElementById("logoutBtn").addEventListener("click", () => {
        sessionStorage.clear(); 
        location.reload();
    });
});