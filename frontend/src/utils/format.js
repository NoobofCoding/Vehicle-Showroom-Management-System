export const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

export const shortDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : ""

export const today = () => {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function serializeCsv(rows) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const cell = (value) => {
    let text = String(value ?? "")
    if (typeof value === "string") {
      let firstNonControl = 0
      while (
        firstNonControl < text.length &&
        text.charCodeAt(firstNonControl) <= 0x20
      )
        firstNonControl += 1

      if ("=+-@".includes(text[firstNonControl] || "")) text = `'${text}`
    }
    return `"${text.replaceAll('"', '""')}"`
  }
  return [
    headers.map(cell).join(","),
    ...rows.map((row) => headers.map((h) => cell(row[h])).join(",")),
  ].join("\r\n")
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return
  const csv = serializeCsv(rows)
  const link = document.createElement("a")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
