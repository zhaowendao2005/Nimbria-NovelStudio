export interface InitProgressState {
  isInitializing: boolean
  currentStage: string
  currentStageLabel: string
  currentProgress: number
  stageProgress: {
    dataAdapt: number
    layoutCalc: number
    styleGen: number
  }
  details: {
    processedNodes: number
    totalNodes: number
    speed: string
    elapsedTime: number
    estimatedRemaining: number
  }
  error: string | null
  errorStack?: string | undefined
  canCancel: boolean
  canPause: boolean
  canResume: boolean
  performanceMetrics?: {
    dataAdaptTime: number
    layoutCalcTime: number
    styleGenTime: number
    totalTime: number
    nodesPerSecond?: number
  } | undefined
}

export const DEFAULT_INIT_PROGRESS_STATE: InitProgressState = {
  isInitializing: false,
  currentStage: '',
  currentStageLabel: '',
  currentProgress: 0,
  stageProgress: {
    dataAdapt: 0,
    layoutCalc: 0,
    styleGen: 0
  },
  details: {
    processedNodes: 0,
    totalNodes: 0,
    speed: '0 nodes/s',
    elapsedTime: 0,
    estimatedRemaining: 0
  },
  error: null,
  canCancel: false,
  canPause: false,
  canResume: false
}
