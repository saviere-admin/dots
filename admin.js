document.addEventListener("DOMContentLoaded", () => {
    const loginView = document.getElementById("loginView");
    const dashboardView = document.getElementById("dashboardView");
    const authForm = document.getElementById("authForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const waitlistTableBody = document.getElementById("waitlistTableBody");
    const waitlistCount = document.getElementById("waitlistCount");
    const notifyForm = document.getElementById("notifyForm");

    // Check if already authenticated in this session
    const storedPwd = sessionStorage.getItem("dots_admin_pwd");
    const storedGit = sessionStorage.getItem("dots_admin_git");

    if (storedPwd && storedGit) {
        showDashboard();
        fetchWaitlist(storedPwd, storedGit);
    }

    // 1. Handle Login
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pwd = document.getElementById("adminPwd").value;
        const git = document.getElementById("githubToken").value;
        const btn = document.getElementById("loginBtn");
        const err = document.getElementById("loginError");
        
        btn.textContent = "Authenticating...";
        err.classList.add("hidden");

        // Ping waitlist API to verify credentials
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: {
                    "X-Admin-Password": pwd,
                    "X-GitHub-Token": git
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Authentication failed");
            }

            // Auth Success
            sessionStorage.setItem("dots_admin_pwd", pwd);
            sessionStorage.setItem("dots_admin_git", git);
            
            authForm.reset();
            showDashboard();
            fetchWaitlist(pwd, git);

        } catch (error) {
            err.textContent = error.message;
            err.classList.remove("hidden");
        } finally {
            btn.textContent = "Authenticate";
        }
    });

    // 2. Handle Logout
    logoutBtn.addEventListener("click", () => {
        sessionStorage.clear();
        loginView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
        logoutBtn.classList.add("hidden");
    });

    // 3. Fetch Database
    async function fetchWaitlist(pwd, git) {
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: {
                    "X-Admin-Password": pwd,
                    "X-GitHub-Token": git
                }
            });
            
            if (res.status === 401 || res.status === 403) {
                logoutBtn.click();
                return;
            }

            const { data } = await res.json();
            
            waitlistCount.textContent = `${data.length} Users`;
            waitlistTableBody.innerHTML = data.map(user => `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-500">${user.source}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-400 text-xs">${new Date(user.created_at).toLocaleString()}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error("Failed to fetch waitlist:", error);
        }
    }

    // 4. Handle Broadcast Email
    notifyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const subject = document.getElementById("emailSubject").value;
        const html = document.getElementById("emailBody").value;
        const btn = document.getElementById("sendBtn");
        const statusBox = document.getElementById("notifyStatus");

        if (!confirm("Are you sure you want to broadcast this email to the entire waitlist?")) return;

        btn.textContent = "Dispatching...";
        btn.disabled = true;
        statusBox.classList.add("hidden");

        const pwd = sessionStorage.getItem("dots_admin_pwd");
        const git = sessionStorage.getItem("dots_admin_git");

        try {
            const res = await fetch("/api/admin/notifications", {
                method: "POST",
                headers: {
                    "X-Admin-Password": pwd,
                    "X-GitHub-Token": git,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ subject, html })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to send broadcast");

            statusBox.textContent = `Success! Dispatched to ${data.count} recipients.`;
            statusBox.className = "text-sm p-3 rounded-lg mb-4 bg-green-50 text-green-700 border border-green-200 block";
            notifyForm.reset();

        } catch (error) {
            statusBox.textContent = error.message;
            statusBox.className = "text-sm p-3 rounded-lg mb-4 bg-red-50 text-red-700 border border-red-200 block";
        } finally {
            btn.textContent = "Send Broadcast";
            btn.disabled = false;
        }
    });

    // Helper functions
    function showDashboard() {
        loginView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        logoutBtn.classList.remove("hidden");
    }
});