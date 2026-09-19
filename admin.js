document.addEventListener("DOMContentLoaded", () => {
    const passwordModal = document.getElementById("passwordModal");
    const sysPasswordInput = document.getElementById("sysPasswordInput");
    const sysPasswordBtn = document.getElementById("sysPasswordBtn");
    const pwdError = document.getElementById("pwdError");

    const githubView = document.getElementById("githubView");
    const patForm = document.getElementById("patForm");
    const patBtn = document.getElementById("patBtn");
    const patError = document.getElementById("patError");

    const dashboardView = document.getElementById("dashboardView");
    
    // Explicit password check
    const REQUIRED_PWD = "Saviere@798959885#";
    let activePassword = null;

    // Ensure session skips auth if already logged in
    const storedPwd = sessionStorage.getItem("dots_admin_pwd");
    const storedGit = sessionStorage.getItem("dots_admin_git");
    
    if (storedPwd === REQUIRED_PWD && storedGit) {
        activePassword = storedPwd;
        unlockDashboard(storedGit);
    } else {
        // Force modal to be visible initially
        passwordModal.classList.remove("hidden");
    }

    // --- 1. System Password Layer ---
    sysPasswordBtn.addEventListener("click", () => {
        const inputVal = sysPasswordInput.value.trim();
        // Exact match required
        if (inputVal === REQUIRED_PWD) {
            activePassword = inputVal;
            // Force hide modal, force show Github View
            passwordModal.style.display = "none";
            githubView.classList.remove("hidden");
        } else {
            pwdError.classList.remove("hidden");
            sysPasswordInput.value = "";
        }
    });

    // --- 2. GitHub PAT Layer ---
    patForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const gitToken = document.getElementById("githubToken").value.trim();
        patBtn.textContent = "Verifying...";
        patError.classList.add("hidden");

        try {
            // Ping waitlist API to verify both credentials
            const res = await fetch("/api/admin/waitlist", {
                headers: {
                    "X-Admin-Password": activePassword,
                    "X-GitHub-Token": gitToken
                }
            });

            if (!res.ok) throw new Error("GitHub Authorization failed or token invalid.");

            // Store success
            sessionStorage.setItem("dots_admin_pwd", activePassword);
            sessionStorage.setItem("dots_admin_git", gitToken);
            
            unlockDashboard(gitToken);

        } catch (error) {
            patError.textContent = error.message;
            patError.classList.remove("hidden");
            patBtn.textContent = "Connect Backend";
        }
    });

    // --- 3. Reveal Dashboard ---
    function unlockDashboard(gitToken) {
        document.body.classList.remove('overflow-hidden');
        document.body.style.backgroundColor = '#FAFAFA';
        document.body.style.color = '#111';
        
        if (passwordModal) passwordModal.style.display = "none";
        if (githubView) githubView.classList.add("hidden");
        
        dashboardView.classList.remove("hidden");
        fetchWaitlist(activePassword, gitToken);
    }

    // --- 4. Lock Console ---
    document.getElementById("logoutBtn").addEventListener("click", () => {
        sessionStorage.clear();
        location.reload(); 
    });

    // --- 5. Data Fetching ---
    async function fetchWaitlist(pwd, git) {
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: { "X-Admin-Password": pwd, "X-GitHub-Token": git }
            });
            const { data } = await res.json();
            document.getElementById("waitlistCount").textContent = data.length;
            document.getElementById("waitlistTableBody").innerHTML = data.map(u => `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-4 text-gray-900 font-medium">${u.email}</td>
                    <td class="py-4 text-gray-400 text-xs text-right">${new Date(u.created_at).toLocaleString()}</td>
                </tr>
            `).join('');
        } catch (e) { console.error("Database sync failed", e); }
    }

    // --- 6. Broadcast Engine ---
    const notifyForm = document.getElementById("notifyForm");
    if (notifyForm) {
        notifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const subject = document.getElementById("emailSubject").value;
            const html = document.getElementById("emailBody").value;
            const btn = document.getElementById("sendBtn");
            const statusBox = document.getElementById("notifyStatus");

            if (!confirm("Dispatch broadcast to entire waitlist?")) return;
            btn.disabled = true; btn.textContent = "Dispatching...";
            statusBox.classList.add("hidden");

            try {
                const res = await fetch("/api/admin/notifications", {
                    method: "POST",
                    headers: {
                        "X-Admin-Password": activePassword,
                        "X-GitHub-Token": sessionStorage.getItem("dots_admin_git"),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ subject, html })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                statusBox.textContent = `Success: Delivered to ${data.count} users via Resend.`;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-green-100 text-green-700 border border-green-200 block";
                notifyForm.reset();
            } catch (error) {
                statusBox.textContent = `Broadcast Failed: ${error.message}`;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-red-100 text-red-700 border border-red-200 block";
            } finally {
                btn.disabled = false; btn.textContent = "Dispatch Payload";
            }
        });
    }
});