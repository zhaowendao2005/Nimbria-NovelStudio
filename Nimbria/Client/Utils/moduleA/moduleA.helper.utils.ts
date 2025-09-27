// 模块A辅助工具函数
export class ModuleAHelper {
  // TODO: 实现具体工具函数
  static formatData(data: unknown): string {
    return JSON.stringify(data, null, 2)
  }

  static validateInput(input: unknown): boolean {
    return input != null
  }
}