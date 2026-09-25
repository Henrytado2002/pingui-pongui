export function normalizePlayerName(firstName, lastName) {
  const rawFirst = String(firstName ?? '').trim();
  const rawLast = String(lastName ?? '').trim();

  const parsedFirst = rawFirst.includes(' ') && !rawLast ? rawFirst.split(/\s+/)[0] : rawFirst;
  const parsedLast = rawLast || (rawFirst.includes(' ') && !rawLast ? rawFirst.split(/\s+/).slice(1).join(' ') : '');

  const first = normalizeNamePart(parsedFirst);
  const last = normalizeNamePart(parsedLast);

  if (!first || !last) {
    throw new Error('Please enter both first and last names.');
  }

  const fullDisplayName = `${first} ${last}`;
  if (fullDisplayName.length > 16) {
    return `${first} ${last.charAt(0)}.`;
  }

  return fullDisplayName;
}

function normalizeNamePart(value) {
  const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .toLowerCase()
    .split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ');
}
