const CONTEXT_SECTIONS = ['pipeline', 'clients', 'calendar', 'reports'] as const;

export function nextUrlForProjectChange(pathname: string, projectId: string | null): string {
  const projectMatch = /^\/projects\/[^/]+(?:\/([^/?]+))?/.exec(pathname);
  if (projectMatch) {
    const section = projectMatch[1];
    if (projectId) {
      return section ? `/projects/${projectId}/${section}` : `/projects/${projectId}`;
    }
    if (section && (CONTEXT_SECTIONS as readonly string[]).includes(section)) {
      return `/${section}`;
    }
    return '/projects';
  }

  if (projectId) {
    const globalMatch = /^\/(pipeline|clients|calendar|reports)(\/.*)?$/.exec(pathname);
    if (globalMatch) {
      return `/projects/${projectId}/${globalMatch[1]}`;
    }
  }

  return pathname;
}
