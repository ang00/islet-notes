const unlockedNotebooks = new Set<string>();

export function unlockNotebookSession(notebookId: string) {
  unlockedNotebooks.add(notebookId);
}

export function isUnlockedInSession(notebookId: string): boolean {
  return unlockedNotebooks.has(notebookId);
}
