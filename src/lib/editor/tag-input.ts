export function parseTagInput(value: string) {
  return [...new Set(
    value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

export function formatTagInput(values: string[] | undefined) {
  return (values ?? []).join(', ');
}
