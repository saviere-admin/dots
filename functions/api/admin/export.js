function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT
        id,
        full_name,
        email,
        phone,
        category,
        interest,
        notes,
        created_at
       FROM waitlist
       ORDER BY datetime(created_at) DESC, id DESC`
    ).all();

    const headers = [
      "id",
      "full_name",
      "email",
      "phone",
      "category",
      "interest",
      "notes",
      "created_at",
    ];

    const rows = (results || []).map((row) =>
      headers.map((key) => csvCell(row[key])).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\r\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dots-waitlist-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);

    return new Response("Unable to export waitlist.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
