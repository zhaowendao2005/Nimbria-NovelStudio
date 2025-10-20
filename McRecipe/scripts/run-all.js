#!/usr/bin/env node
/**
 * 完整运行脚本
 * 按顺序执行所有处理阶段：
 * 1. 解析日志 -> recipes.raw.json
 * 2. 提取翻译键（去重） -> lang.yaml + lang.mapping.json
 * 3. [可选] AI翻译 -> lang.cn.yaml
 * 4. [可选] 合并翻译 -> recipes.cn.json
 * 5. 生成优化索引 -> 各类JSON索引
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

class RecipeProcessor {
  constructor(skipTranslation = false) {
    this.skipTranslation = skipTranslation;
    this.startTime = Date.now();
    this.stages = [];
    this.completedStages = [];
  }

  /**
   * 主运行流程
   */
  async run() {
    console.clear();
    console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  MC 配方翻译处理系统 v1.0            ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

    if (this.skipTranslation) {
      console.log(`${colors.yellow}⚙️  工作模式: 跳过AI翻译阶段${colors.reset}\n`);
      console.log(`📋 流程：\n`);
      console.log(`  1️⃣  ${colors.blue}解析日志${colors.reset} → recipes.raw.json`);
      console.log(`  2️⃣  ${colors.blue}提取翻译键${colors.reset} → lang.yaml + lang.mapping.json`);
      console.log(`  3️⃣  ${colors.blue}生成索引${colors.reset} → 各类优化JSON\n`);
    } else {
      console.log(`${colors.green}✨ 工作模式: 完整翻译流程${colors.reset}\n`);
      console.log(`📋 流程：\n`);
      console.log(`  1️⃣  ${colors.blue}解析日志${colors.reset} → recipes.raw.json`);
      console.log(`  2️⃣  ${colors.blue}提取翻译键${colors.reset} → lang.yaml + lang.mapping.json`);
      console.log(`  3️⃣  ${colors.blue}AI翻译${colors.reset} → lang.cn.yaml（需要配置和手动运行）`);
      console.log(`  4️⃣  ${colors.blue}合并翻译${colors.reset} → recipes.cn.json`);
      console.log(`  5️⃣  ${colors.blue}生成索引${colors.reset} → 各类优化JSON\n`);
    }

    try {
      // 1. 解析日志
      console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      console.log(`${colors.bright}🔍 阶段1: 解析日志文件${colors.reset}`);
      console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      await this.runStage('parser');

      // 2. 提取翻译键
      console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      console.log(`${colors.bright}📝 阶段2: 提取翻译键（去重）${colors.reset}`);
      console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      await this.runStage('extract-lang');

      // 3. AI翻译（可选）
      if (!this.skipTranslation) {
        console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
        console.log(`${colors.bright}🌐 阶段3: AI翻译${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
        
        const hasTranslation = await this.checkTranslationFile();
        if (!hasTranslation) {
          console.log(`${colors.yellow}⚠️  未找到 lang.cn.yaml，跳过合并和索引生成${colors.reset}`);
          console.log(`${colors.yellow}请按以下步骤完成翻译：${colors.reset}\n`);
          console.log(`  1. 编辑 config.yaml，配置API密钥`);
          console.log(`  2. 运行：${colors.green}node scripts/translate-with-ai.js${colors.reset}`);
          console.log(`  3. 翻译完成后再运行本脚本\n`);
          
          console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
          console.log(`${colors.green}✅ 前置阶段完成！${colors.reset}`);
          console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
          this.printSummary();
          return;
        }

        // 4. 合并翻译
        console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
        console.log(`${colors.bright}🔗 阶段4: 合并翻译${colors.reset}`);
        console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
        await this.runStage('merge-translation');
      }

      // 5. 生成索引
      console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      console.log(`${colors.bright}📊 阶段5: 生成优化索引${colors.reset}`);
      console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      await this.runStage('generate-indexes');

      // 成功完成
      console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
      console.log(`${colors.green}${colors.bright}✅ 所有阶段完成！${colors.reset}`);
      console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}\n`);
      
      this.printSummary();

    } catch (error) {
      console.error(`\n${colors.red}${colors.bright}❌ 处理失败！${colors.reset}`);
      console.error(`${colors.red}错误: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  /**
   * 运行单个阶段
   */
  async runStage(stageName) {
    const scriptPath = path.join(__dirname, `${this.getScriptName(stageName)}.js`);
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: path.dirname(scriptPath)
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.completedStages.push(stageName);
          resolve();
        } else {
          reject(new Error(`${stageName} 阶段失败，退出码: ${code}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`${stageName} 阶段错误: ${err.message}`));
      });
    });
  }

  /**
   * 获取脚本名称
   */
  getScriptName(stageName) {
    const mapping = {
      'parser': '1-parser',
      'extract-lang': '2-extract-lang',
      'translate': 'translate-with-ai',
      'merge-translation': '3-merge-translation',
      'generate-indexes': '4-generate-indexes'
    };
    return mapping[stageName] || stageName;
  }

  /**
   * 检查翻译文件是否存在
   */
  async checkTranslationFile() {
    const translationPath = path.join(__dirname, '../output/lang.cn.yaml');
    return fs.existsSync(translationPath);
  }

  /**
   * 打印总结
   */
  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log(`${colors.blue}📊 执行总结：${colors.reset}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${colors.green}✓ 已完成的阶段：${colors.reset}`);
    
    this.completedStages.forEach((stage, index) => {
      const names = {
        'parser': '📄 日志解析',
        'extract-lang': '📝 翻译键提取',
        'merge-translation': '🔗 翻译合并',
        'generate-indexes': '📊 索引生成'
      };
      console.log(`  ${index + 1}. ${names[stage] || stage}`);
    });

    console.log(`\n${colors.cyan}⏱️  总耗时：${colors.reset} ${duration}秒`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // 输出文件位置
    console.log(`\n${colors.blue}📁 生成文件位置：${colors.reset}`);
    const outputDir = path.join(__dirname, '../output');
    
    const files = [
      'recipes.raw.json - 解析后的原始配方',
      'lang.yaml - 英文名称去重',
      'lang.mapping.json - ID到英文名称的映射'
    ];

    if (this.completedStages.includes('merge-translation')) {
      files.push('recipes.cn.json - 带中文翻译的配方');
      files.push('lang.cn.yaml - 中文翻译');
    }

    if (this.completedStages.includes('generate-indexes')) {
      files.push('items.index.json - 物品索引');
      files.push('platforms.index.json - 平台索引');
      files.push('recipe.graph.json - 配方图数据');
      files.push('search.index.json - 搜索索引');
      files.push('incremental/* - 平台增量数据');
    }

    files.forEach(file => {
      console.log(`  📄 ${file}`);
    });

    console.log(`\n${colors.green}💡 下一步建议：${colors.reset}`);
    
    if (!this.completedStages.includes('merge-translation')) {
      console.log(`  1. 配置 config.yaml 中的 API 密钥`);
      console.log(`  2. 运行 ${colors.green}node scripts/translate-with-ai.js${colors.reset}`);
      console.log(`  3. 翻译完成后再次运行本脚本完成后续流程\n`);
    } else if (!this.completedStages.includes('generate-indexes')) {
      console.log(`  运行完整流程来生成所有优化索引\n`);
    } else {
      console.log(`  所有阶段已完成！可以开始使用生成的数据文件\n`);
    }
  }
}

// 主入口
async function main() {
  // 检查命令行参数
  const args = process.argv.slice(2);
  const skipTranslation = args.includes('--skip-translation') || args.includes('-s');

  const processor = new RecipeProcessor(skipTranslation);
  await processor.run();
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}未处理的错误：${colors.reset}`, error);
  process.exit(1);
});

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RecipeProcessor;

