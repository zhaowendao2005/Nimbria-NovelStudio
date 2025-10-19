#!/usr/bin/env node
/**
 * 一键运行所有脚本
 * 按顺序执行：parser -> extract-lang -> merge-translation -> generate-indexes
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS = [
  {
    name: '阶段1：日志解析',
    script: '1-parser.js',
    required: true
  },
  {
    name: '阶段2：提取翻译键',
    script: '2-extract-lang.js',
    required: true
  },
  {
    name: '阶段3：合并翻译',
    script: '3-merge-translation.js',
    required: false,  // 可能没有翻译文件
    skipMessage: '⚠️  跳过翻译合并（未找到 lang.cn.yaml）'
  },
  {
    name: '阶段4：生成索引',
    script: '4-generate-indexes.js',
    required: true
  }
];

class PipelineRunner {
  constructor() {
    this.currentStep = 0;
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 开始运行MC配方转换流水线...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (let i = 0; i < SCRIPTS.length; i++) {
      this.currentStep = i + 1;
      const config = SCRIPTS[i];

      // 检查是否应该跳过
      if (!config.required && this.shouldSkip(config)) {
        console.log(`\n${config.skipMessage || `⏭️  跳过 ${config.name}`}\n`);
        continue;
      }

      const success = await this.runScript(config);
      
      if (!success && config.required) {
        console.error(`\n❌ 流水线失败于阶段${this.currentStep}：${config.name}`);
        process.exit(1);
      }
    }

    this.printSummary();
  }

  shouldSkip(config) {
    // 检查翻译文件是否存在
    if (config.script === '3-merge-translation.js') {
      const langPath = path.join(__dirname, '../output/lang.cn.yaml');
      return !fs.existsSync(langPath);
    }
    return false;
  }

  runScript(config) {
    return new Promise((resolve) => {
      console.log(`\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`┃ 阶段 ${this.currentStep}/${SCRIPTS.length}: ${config.name}`);
      console.log(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const scriptPath = path.join(__dirname, config.script);
      const startTime = Date.now();

      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (code === 0) {
          console.log(`\n✅ 完成！耗时 ${duration}秒`);
          this.results.push({
            name: config.name,
            success: true,
            duration: parseFloat(duration)
          });
          resolve(true);
        } else {
          console.error(`\n❌ 失败！退出代码 ${code}`);
          this.results.push({
            name: config.name,
            success: false,
            duration: parseFloat(duration),
            errorCode: code
          });
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.error(`\n❌ 执行错误：${error.message}`);
        this.results.push({
          name: config.name,
          success: false,
          error: error.message
        });
        resolve(false);
      });
    });
  }

  printSummary() {
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const successCount = this.results.filter(r => r.success).length;

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 流水线执行摘要');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.results.forEach((result, i) => {
      const icon = result.success ? '✅' : '❌';
      const status = result.success ? '成功' : '失败';
      const time = result.duration ? `${result.duration}秒` : 'N/A';
      console.log(`${icon} 阶段${i + 1}: ${result.name} - ${status} (${time})`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总计: ${successCount}/${this.results.length} 成功`);
    console.log(`总耗时: ${totalDuration}秒`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount === this.results.length) {
      console.log('🎉 所有阶段执行完成！\n');
      this.printNextSteps();
    } else {
      console.log('⚠️  部分阶段执行失败，请查看上面的错误信息\n');
    }
  }

  printNextSteps() {
    console.log('📝 后续步骤：\n');
    
    const langPath = path.join(__dirname, '../output/lang.yaml');
    if (fs.existsSync(langPath)) {
      console.log('1. 翻译 lang.yaml 文件：');
      console.log(`   - 使用AI翻译工具（推荐GPT-4o-mini）`);
      console.log(`   - 保存为 lang.cn.yaml`);
      console.log(`   - 重新运行: node 3-merge-translation.js\n`);
    }

    console.log('2. 查看生成的文件：');
    const outputDir = path.join(__dirname, '../output');
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        if (file.endsWith('.json') || file.endsWith('.yaml')) {
          console.log(`   - output/${file}`);
        }
      });
    }

    console.log('\n3. 使用索引文件：');
    console.log(`   - items.index.json: 物品快速查询`);
    console.log(`   - platforms.index.json: 按平台筛选`);
    console.log(`   - recipe.graph.json: 喂给Sigma.js StarChart`);
    console.log(`   - search.index.json: 全文搜索`);
    console.log(`   - incremental/: 按需加载\n`);
  }
}

// 主入口
async function main() {
  // 检查Node版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    console.error('❌ 错误：需要 Node.js 14.0.0 或更高版本');
    console.error(`   当前版本：${nodeVersion}`);
    process.exit(1);
  }

  // 检查输入文件
  const logPath = path.join(__dirname, '../recipes.log');
  if (!fs.existsSync(logPath)) {
    console.error('❌ 错误：找不到 recipes.log 文件');
    console.error(`   请将日志文件放在: ${logPath}`);
    process.exit(1);
  }

  const runner = new PipelineRunner();
  await runner.run();
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('\n❌ 未处理的错误：', error);
  process.exit(1);
});

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PipelineRunner;

