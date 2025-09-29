import Store from 'electron-store'

import type { RecentProject } from '../types/ipc'

interface RecentProjectsSchema {
  recentProjects: RecentProject[]
}

const RECENT_PROJECT_LIMIT = 20

const store = new Store<RecentProjectsSchema>({
  name: 'nimbria-projects',
  defaults: {
    recentProjects: []
  }
})

function normalizeProjectName(projectPath: string): string {
  const segments = projectPath.split(/[/\\]/).filter(Boolean)
  if (segments.length === 0) {
    return '未命名项目'
  }
  return segments[segments.length - 1]
}

export function getRecentProjects(): RecentProject[] {
  return store.get('recentProjects')
}

export function upsertRecentProject(projectPath: string, projectName?: string): RecentProject {
  const name = projectName?.trim() || normalizeProjectName(projectPath)
  const id = `project-${Buffer.from(projectPath).toString('base64')}`
  const now = new Date().toISOString()

  const existing = getRecentProjects().filter((project) => project.path !== projectPath)

  const updated: RecentProject = {
    id,
    name,
    path: projectPath,
    lastOpened: now
  }

  const projects = [updated, ...existing].slice(0, RECENT_PROJECT_LIMIT)
  store.set('recentProjects', projects)
  return updated
}

export function removeRecentProject(projectPath: string): void {
  const filtered = getRecentProjects().filter((project) => project.path !== projectPath)
  store.set('recentProjects', filtered)
}

export function clearRecentProjects(): void {
  store.set('recentProjects', [])
}

