/**
 * Every distinct person appearing across one or more content sources
 * (logs, goals, ...), sorted for stable output. There is no fixed
 * roster — anyone who has a log or goal entry is a person.
 */
export function getAllPersons(...sources: Array<{ person: string }[]>): string[] {
  const persons = new Set<string>();
  for (const source of sources) {
    for (const item of source) persons.add(item.person);
  }
  return Array.from(persons).sort();
}
