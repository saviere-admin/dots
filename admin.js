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
    const logoutBtn = document.getElementById("logoutBtn");
    
    // Explicit password check
    const REQUIRED_PWD = "Saviere@798959885#";
    let activePassword = null;

    // --- 1. System Password Layer ---
    sysPasswordBtn.addEventListener("click", () => {
        const inputVal = sysPasswordInput.value.trim();
        if (inputVal === REQUIRED_PWD) {
            activePassword = inputVal;
            // Instantly swap UI
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
            const res = await fetch("/api/admin/waitlist", {
                headers: {
                    "X-Admin-Password": activePassword,
                    "X-GitHub-Token": gitToken
                }
            });

            if (!res.ok) throw new Error("GitHub Authorization failed.");

            // Unlock Dashboard
            document.body.classList.remove('flex', 'items-center', 'justify-center', 'overflow-hidden');
            githubView.classList.add("hidden");
            dashboardView.classList.remove("hidden");
            
            fetchWaitlist(activePassword, gitToken);

        } catch (error) {
            patError.textContent = error.message;
            patError.classList.remove("hidden");
            patBtn.textContent = "Connect Backend";
        }
    });

    // --- 3. Logout ---
    logoutBtn.addEventListener("click", () => {
        location.reload(); 
    });

    // --- 4. Core Logic (Data & Email) ---
    async function fetchWaitlist(pwd, git) {
        try {
            const res = await fetch("/api/admin/waitlist", {
                headers: { "X-Admin-Password": pwd, "X-GitHub-Token": git }
            });
            const { data } = await res.json();
            document.getElementById("waitlistCount").textContent = data.length;
            document.getElementById("waitlistTableBody").innerHTML = data.map(u => `
                <tr class="hover:bg-gray-50">
                    <td class="py-4 text-gray-900 font-medium">${u.email}</td>
                    <td class="py-4 text-gray-400 text-xs text-right">${new Date(u.created_at).toLocaleString()}</td>
                </tr>
            `).join('');
        } catch (e) { console.error(e); }
    }

    const notifyForm = document.getElementById("notifyForm");
    if (notifyForm) {
        notifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const subject = document.getElementById("emailSubject").value;
            const html = document.getElementById("emailBody").value;
            const btn = document.getElementById("sendBtn");
            const statusBox = document.getElementById("notifyStatus");

            if (!confirm("Dispatch broadcast?")) return;
            btn.disabled = true; btn.textContent = "Dispatching...";

            try {
                const res = await fetch("/api/admin/notifications", {
                    method: "POST",
                    headers: {
                        "X-Admin-Password": activePassword,
                        "X-GitHub-Token": document.getElementById("githubToken").value.trim(),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ subject, html })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                statusBox.textContent = `Success: Delivered to ${data.count} users.`;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-green-900/30 text-green-400 block";
                notifyForm.reset();
            } catch (error) {
                statusBox.textContent = error.message;
                statusBox.className = "text-xs p-4 rounded-xl mb-6 bg-red-900/30 text-red-400 block";
            } finally {
                btn.disabled = false; btn.textContent = "Dispatch Payload";
            }
        });
    }
});