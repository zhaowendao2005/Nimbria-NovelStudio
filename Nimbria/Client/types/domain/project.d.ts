export interface ProjectData {
  id: string
  name: string
  path: string
  lastModified: string
  content: ProjectContent
}

export interface ProjectContent {
  chapters: Chapter[]
  characters: Character[]
  settings: ProjectSettings
}

export interface Chapter {
  id: string
  title: string
  content: string
  wordCount: number
  createdAt: string
  modifiedAt: string
}

export interface Character {
  id: string
  name: string
  description: string
  avatar?: string
}

export interface ProjectSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  fontFamily: string
  autoSave: boolean
  autoSaveInterval: number
}

export interface ProjectResult {
  success: boolean
  message?: string
  processId?: string
  errorCode?: string
}

export interface SaveResult {
  success: boolean
  error?: string
}

export interface RecentProject {
  id: string
  name: string
  path: string
  lastOpened: string
  thumbnail?: string
}

export interface BroadcastMessage {
  type: string
  data: unknown
  timestamp?: string
  fromProcess: string
}

