export function stripChoiceLabel(option) {
  return String(option).replace(/^[A-D](?:[.)]\s*|:\s*|\s+-\s*)/i, '');
}
