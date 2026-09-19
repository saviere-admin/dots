document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const passwordModal = document.getElementById("passwordModal");
    const pwdModalInner = document.getElementById("pwdModalInner");
    const sysPasswordInput = document.getElementById("sysPasswordInput");
    const sysPasswordBtn = document.getElementById("sysPasswordBtn");
    const pwdError = document.getElementById("pwdError");

    const githubView = document.getElementById("githubView");
    const patForm = document.getElementById("patForm");
    const patBtn = document.getElementById("patBtn");
    const patError = document.getElementById("patError");

    const dashboardView = document.getElementById("dashboardView");
    const logoutBtn = document.getElementById("logoutBtn");
    const waitlistTableBody = document.getElementById("waitlistTableBody");
    const waitlistCount = document.getElementById("waitlistCount");
    const notifyForm = document.getElementById("notifyForm");

    // Exact required password
    const REQUIRED_SYSTEM_PWD = "Saviere@798959885#";
    
    // State variables
    let tempAdminPwd = null;

    // Check existing session
    const storedPwd = sessionStorage.getItem("dots_admin_pwd");
    const storedGit = sessionStorage.getItem("dots_admin_git");

    if (storedPwd === REQUIRED_SYSTEM_PWD && storedGit) {
        tempAdminPwd = storedPwd;
        unlockDashboard(storedGit);
    } else {
        // Run entry animation for modal
        setTimeout(() => pwdModalInner.classList.replace('scale-95', 'scale-100'), 50);
    }

    // --- Step 1: System Password Logic ---
    sysPasswordBtn.addEventListener("click", handleSysPassword);
    sysPasswordInput.addEventListener("keypress", (e) => { if(e.key === 'Enter') handleSysPassword(); });

    function handleSysPassword() {
        const val = sysPasswordInput.value.trim();
        if (val === REQUIRED_SYSTEM_PWD) {
            tempAdminPwd = val;
            // Hide Modal, Show PAT Screen
            passwordModal.classList.add('opacity-0');
            setTimeout(() => {
                passwordModal.classList.add('hidden');
                githubView.classList.remove('hidden');
                document.body.classList.remove('overflow-hidden');
            }, 300);
        } else {
            pwdError.classList.remove('hidden');
            sysPasswordInput.value = '';
            // Shake effect
            pwdModalInner.style.transform = 'translateX(10px)';
            setTimeout(()=> pwdModalInner.style.transform = 'translateX(-10px)', 50);
            setTimeout(()=> pwdModalInner.style.transform = 'translateX(0)', 100);
        }
    }

    // --- Step 2: GitHub PAT Logic ---
    patForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const gitToken = document.getElementById("githubToken").value.trim();
        
        patBtn.textContent = "Verifying Identity...";
        patError.classList.add("hidden");

        try {
            // Ping waitlist API to verify both credentials against Cloudflare _middleware.js
            const res = await fetch("/api/admin/waitlist", {
                headers: {
                    "X-Admin-Password": tempAdminPwd,
                    "X-GitHub-Token": gitToken
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "GitHub Authorization failed.");
            }

            // Success
            sessionStorage.setItem("dots_admin_pwd", tempAdminPwd);
            sessionStorage.setItem("dots_admin_git", gitToken);
            
            unlockDashboard(gitToken);

        } catch (error) {
            patError.textContent = error.message;
            patError.classList.remove("hidden");
            patBtn.textContent = "Connect Backend";
        }
    });

    // --- Step 3: Reveal Dashboard ---
    function unlockDashboard(gitToken) {
        document.body.classList.remove('glitch-bg');
        document.body.style.backgroundColor = '#FAFAFA';
        githubView.classList.add("hidden");
        passwordModal.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        fetchWaitlist(tempAdminPwd, gitToken);
    }

    // --- Step 4: Logout ---
    logoutBtn.addEventListener("click", () => {
        sessionStorage.clear();
        location.reload(); // Hard reload locks everything securely
    });

    // --- API: Fetch Waitlist ---
    async function fetchWaitlist(pwd, git) {
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: { "X-Admin-Password": pwd, "X-GitHub-Token": git }
            });
            if (!res.ok) throw new Error("Auth sync failed");
            const { data } = await res.json();
            
            waitlistCount.textContent = data.length;
            waitlistTableBody.innerHTML = data.map(user => `
                <tr class="hover:bg-gray-50 transition">
                    <td class="py-4 whitespace-nowrap text-gray-900 font-medium">${user.email}</td>
                    <td class="py-4 whitespace-nowrap text-gray-400 text-xs text-right">${new Date(user.created_at).toLocaleString()}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
        }
    }

    // --- API: Broadcast Form ---
    if (notifyForm) {
        notifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const subject = document.getElementById("emailSubject").value;
            const html = document.getElementById("emailBody").value;
            const btn = document.getElementById("sendBtn");
            const statusBox = document.getElementById("notifyStatus");

            if (!confirm("Confirm Network Broadcast?")) return;

            btn.textContent = "Dispatching...";
            btn.disabled = true;
            statusBox.classList.add("hidden");

            try {
                const res = await fetch("/api/admin/notifications", {
                    method: "POST",
                    headers: {
                        "X-Admin-Password": tempAdminPwd,
                        "X-GitHub-Token": sessionStorage.getItem("dots_admin_git"),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ subject, html })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Broadcast failed");

                statusBox.textContent = `Payload Delivered to ${data.count} addresses.`;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-white/10 text-green-400 border border-green-500/20 block";
                notifyForm.reset();
            } catch (error) {
                statusBox.textContent = error.message;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-red-900/30 text-red-400 border border-red-500/20 block";
            } finally {
                btn.textContent = "Dispatch Payload";
                btn.disabled = false;
            }
        });
    }
});