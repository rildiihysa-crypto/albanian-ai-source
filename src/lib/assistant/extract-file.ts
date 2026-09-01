export async function extractLocalFile(file: File) {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) {
    return { kind: "image" as const, name: file.name };
  }
  if (file.type.startsWith("text/") || /\.(txt|md|csv|json|html)$/i.test(name)) {
    return { kind: "text" as const, name: file.name, text: (await file.text()).slice(0, 18_000) };
  }
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText } = await import("unpdf");
    const data = new Uint8Array(await file.arrayBuffer());
    const result = await extractText(data);
    const raw = Array.isArray(result.text) ? result.text.join("\n") : String(result.text || "");
    const text = raw.replace(/\u0000/g, "").replace(/\s+\n/g, "\n").trim().slice(0, 18_000);
    if (text.length < 20) throw new Error("PDF nuk u lexua. Provo një PDF me tekst, jo vetëm skanim.");
    return { kind: "text" as const, name: file.name, text };
  }
  throw new Error("Ky lloj skedari nuk mbështetet. Ngarko foto, PDF ose tekst.");
}
