export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare("SELECT id, email, source, created_at FROM waitlist ORDER BY created_at DESC").all();
        
        if (!results || results.length === 0) {
            return new Response("No data available", { status: 404 });
        }

        // Generate CSV Headers
        const headers = Object.keys(results[0]).join(',');
        
        // Generate CSV Rows
        const rows = results.map(row => {
            return Object.values(row).map(value => `"${value}"`).join(',');
        });
        
        const csvContent = [headers, ...rows].join('\n');

        return new Response(csvContent, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": 'attachment; filename="dots-waitlist.csv"'
            }
        });
    } catch (error) {
        return new Response(`Error generating CSV: ${error.message}`, { status: 500 });
    }
}