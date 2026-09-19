export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// The missing export causing the build failure
export function json(data, init = {}) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init.headers || {})
        }
    });
}

export function generateResponse(data, status = 200) {
    return json(data, { status });
}