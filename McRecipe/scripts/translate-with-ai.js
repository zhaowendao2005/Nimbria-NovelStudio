#!/usr/bin/env node
/**
 * AI自动翻译脚本
 * 使用OpenAI API批量翻译lang.yaml
 * 支持并发、断点续传、进度跟踪
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const yaml = require('js-yaml');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

class AITranslator {
  constructor(configPath, inputPath, outputPath) {
    this.configPath = configPath;
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    
    // 加载配置
    this.loadConfig();
    
    // 进度文件路径
    this.progressPath = path.join(
      path.dirname(outputPath),
      this.config.translation.output.progress_file
    );
    
    // 初始化OpenAI客户端
    this.client = new OpenAI({
      apiKey: this.config.llm.api_key,
      baseURL: this.config.llm.base_url
    });
    
    // 翻译状态
    this.batches = [];
    this.completed = [];
    this.failed = [];
    this.progress = {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: 0
    };
    
    // 限流器
    this.requestQueue = [];
    this.activeRequests = 0;
    this.requestsThisMinute = 0;
    // 注：不再使用 tokensThisMinute，改为单请求token限制
  }

  /**
   * 加载配置文件
   */
  loadConfig() {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(configContent);
      
      // 验证必需字段
      if (!this.config.llm || !this.config.llm.api_key) {
        throw new Error('配置文件缺少 llm.api_key');
      }
      
      console.log(`${colors.green}✓${colors.reset} 配置加载成功`);
      console.log(`  模型: ${this.config.llm.model}`);
      console.log(`  最大并发: ${this.config.llm.max_concurrent}`);
      console.log(`  单次最高token: ${this.config.llm.max_tokens_per_request}`);
      console.log(`  请求限制: ${this.config.llm.requests_per_minute}/分钟`);
      console.log(`  💡 自动切分YAML，少次多量模式`);
      
    } catch (error) {
      console.error(`${colors.red}✗ 配置加载失败:${colors.reset}`, error.message);
      process.exit(1);
    }
  }

  /**
   * 主翻译流程
   */
  async translate() {
    console.log(`\n${colors.bright}🌐 开始AI翻译流程${colors.reset}\n`);
    
    const startTime = Date.now();

    try {
      // 1. 读取并解析输入文件
      console.log(`${colors.cyan}📖 读取输入文件...${colors.reset}`);
      const data = this.parseInputFile();
      
      // 2. 检查断点续传
      const savedProgress = this.loadProgress();
      
      // 3. 分割为批次
      console.log(`${colors.cyan}✂️  分割翻译批次...${colors.reset}`);
      this.createBatches(data, savedProgress);
      
      // 4. 并发翻译
      console.log(`${colors.cyan}🚀 开始并发翻译...${colors.reset}\n`);
      await this.translateBatches();
      
      // 5. 合并结果
      console.log(`\n${colors.cyan}🔗 合并翻译结果...${colors.reset}`);
      await this.mergeResults(data);
      
      // 6. 保存输出
      console.log(`${colors.cyan}💾 保存输出文件...${colors.reset}`);
      await this.saveOutput();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n${colors.green}${colors.bright}✓ 翻译完成！${colors.reset}`);
      console.log(`  总耗时: ${duration}秒`);
      this.printStatistics();
      
      // 清理进度文件
      if (fs.existsSync(this.progressPath)) {
        fs.unlinkSync(this.progressPath);
      }
      
    } catch (error) {
      console.error(`\n${colors.red}✗ 翻译失败:${colors.reset}`, error.message);
      console.error(error.stack);
      
      // 保存进度
      this.saveProgress();
      console.log(`\n💾 进度已保存，可以稍后继续`);
      
      process.exit(1);
    }
  }

  /**
   * 解析输入YAML文件
   */
  parseInputFile() {
    const content = fs.readFileSync(this.inputPath, 'utf8');
    const lines = content.split('\n');
    
    const data = {
      platforms: new Map(),
      items: new Map(),
      recipes: new Map()
    };
    
    let currentSection = null;
    
    for (const line of lines) {
      // 跳过注释和空行
      if (line.trim().startsWith('#') || line.trim() === '') continue;
      
      // 识别section
      if (line.match(/^(platforms|items|recipes):$/)) {
        currentSection = line.replace(':', '');
        continue;
      }
      
      // 解析键值对
      const match = line.match(/^\s+(.+?):\s*"(.*)"\s*$/);
      if (match && currentSection) {
        const [, key, value] = match;
        data[currentSection].set(key.trim(), value);
      }
    }
    
    console.log(`  平台: ${data.platforms.size}`);
    console.log(`  物品: ${data.items.size}`);
    console.log(`  配方: ${data.recipes.size}`);
    
    return data;
  }

  /**
   * 创建翻译批次（根据单次最高token自动切分）
   */
  createBatches(data, savedProgress) {
    const maxTokensPerRequest = this.config.llm.max_tokens_per_request;
    let batchId = 0;
    
    // 翻译平台
    this.createBatchesForSection('platforms', data.platforms, batchId, maxTokensPerRequest, savedProgress);
    batchId += this.batches.filter(b => b.section === 'platforms').length;
    
    // 翻译物品
    this.createBatchesForSection('items', data.items, batchId, maxTokensPerRequest, savedProgress);
    
    // 配方通常不翻译或数量过多，跳过
    if (this.config.translation.translate_recipe_ids) {
      batchId += this.batches.filter(b => b.section === 'items').length;
      this.createBatchesForSection('recipes', data.recipes, batchId, maxTokensPerRequest, savedProgress);
    }
    
    this.progress.total = this.batches.length;
    
    console.log(`  总批次: ${this.batches.length}`);
    console.log(`  单次最高token: ${maxTokensPerRequest}`);
    
    if (savedProgress) {
      const resumeCount = this.batches.filter(b => b.status === 'pending').length;
      console.log(`  ${colors.yellow}⚡ 从上次中断处继续，剩余 ${resumeCount} 批${colors.reset}`);
    }
  }

  /**
   * 为某个section创建批次（根据token自动切分）
   */
  createBatchesForSection(section, dataMap, startId, maxTokensPerRequest, savedProgress) {
    const entries = Array.from(dataMap.entries());
    let currentBatch = [];
    let currentTokens = this.estimateTokens(`${section}:\n`); // header
    let batchId = startId;
    
    for (const [key, value] of entries) {
      // 估算这条entry需要的token
      const entryYaml = `  ${key}: "${value}"\n`;
      const entryTokens = this.estimateTokens(entryYaml);
      
      // 如果加上这条会超过limit，就新建一个batch
      if (currentTokens + entryTokens > maxTokensPerRequest && currentBatch.length > 0) {
        // 保存当前batch
        const savedBatch = savedProgress?.completed?.find(b => b.id === batchId);
        this.batches.push({
          id: batchId,
          section,
          entries: currentBatch,
          status: savedBatch ? 'completed' : 'pending',
          result: savedBatch?.result || null,
          attempts: 0
        });
        
        if (savedBatch) {
          this.completed.push(batchId);
          this.progress.completed++;
        }
        
        batchId++;
        currentBatch = [];
        currentTokens = this.estimateTokens(`${section}:\n`);
      }
      
      currentBatch.push([key, value]);
      currentTokens += entryTokens;
    }
    
    // 保存最后一个batch
    if (currentBatch.length > 0) {
      const savedBatch = savedProgress?.completed?.find(b => b.id === batchId);
      this.batches.push({
        id: batchId,
        section,
        entries: currentBatch,
        status: savedBatch ? 'completed' : 'pending',
        result: savedBatch?.result || null,
        attempts: 0
      });
      
      if (savedBatch) {
        this.completed.push(batchId);
        this.progress.completed++;
      }
    }
  }

  /**
   * 并发翻译所有批次
   */
  async translateBatches() {
    const maxConcurrent = this.config.llm.max_concurrent;
    const pendingBatches = this.batches.filter(b => b.status === 'pending');
    
    // 启动进度显示
    this.startProgressDisplay();
    
    // 并发控制
    const workers = [];
    for (let i = 0; i < maxConcurrent; i++) {
      workers.push(this.worker(i));
    }
    
    await Promise.all(workers);
    
    // 停止进度显示
    this.stopProgressDisplay();
  }

  /**
   * 工作线程
   */
  async worker(workerId) {
    while (true) {
      // 获取下一个待处理批次
      const batch = this.batches.find(b => b.status === 'pending');
      if (!batch) break;
      
      batch.status = 'processing';
      this.progress.inProgress++;
      
      try {
        // 等待限流（根据API错误自动调整）
        await this.waitForRateLimit();
        
        // 翻译（会在内部处理429限流，无限重试直到成功）
        const result = await this.translateBatch(batch, workerId);
        
        batch.status = 'completed';
        batch.result = result;
        this.completed.push(batch.id);
        
        this.progress.completed++;
        this.progress.inProgress--;
        
        // 定期保存进度
        if (this.progress.completed % 10 === 0) {
          this.saveProgress();
        }
        
      } catch (error) {
        // 只有非429错误才计入retry_times
        batch.attempts++;
        
        if (batch.attempts >= this.config.llm.retry_times) {
          batch.status = 'failed';
          batch.error = error.message;
          this.failed.push(batch.id);
          
          this.progress.failed++;
          this.progress.inProgress--;
          
          this.log(
            `Worker ${workerId}: 批次 ${batch.id} 最终失败 - ${error.message}`,
            'error'
          );
        } else {
          batch.status = 'pending';
          this.progress.inProgress--;
          
          this.log(
            `Worker ${workerId}: 批次 ${batch.id} 重试 ${batch.attempts}/${this.config.llm.retry_times}`,
            'warn'
          );
          
          // 等待后重试
          await this.sleep(this.config.llm.retry_delay * 1000);
        }
      }
    }
  }

  /**
   * 翻译单个批次（429限流自动排队，不计入重试次数）
   */
  async translateBatch(batch, workerId) {
    // 构建YAML格式的输入
    let yamlInput = `${batch.section}:\n`;
    for (const [key, value] of batch.entries) {
      yamlInput += `  ${key}: "${value}"\n`;
    }
    
    const tokenCount = this.estimateTokens(yamlInput);
    this.log(
      `Worker ${workerId}: 批次 ${batch.id} - ${batch.entries.length} 项，约 ${tokenCount} tokens`,
      'debug'
    );
    
    // 调用API（让API按其规则处理）
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.llm.model,
        messages: [
          {
            role: 'system',
            content: this.config.translation.system_prompt
          },
          {
            role: 'user',
            content: `请将以下内容翻译成简体中文，保持YAML格式：\n\n${yamlInput}`
          }
        ]
      });
      
      // 解析响应
      const translated = response.choices[0].message.content;
      return this.parseTranslatedYAML(translated, batch.section);
      
    } catch (error) {
      // 如果是限流错误（429），自动排队等待，**不抛出错误**，直接重试
      if (error.status === 429 || error.code === 'rate_limit_exceeded') {
        const retryAfter = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) 
          : 60;
        
        this.log(
          `🚦 API限流（429）- 等待 ${retryAfter}秒后自动重试（不计入重试次数）...`,
          'warn'
        );
        
        await this.sleep(retryAfter * 1000);
        
        // 递归重试（直到成功，不计入重试次数）
        return this.translateBatch(batch, workerId);
      }
      
      // 其他错误才会被计入重试次数
      throw error;
    }
  }

  /**
   * 限流控制（基于请求次数）
   */
  async waitForRateLimit() {
    const rateLimit = this.config.llm.requests_per_minute;
    
    // 如果已经超过每分钟限制，等待
    if (this.requestsThisMinute >= rateLimit) {
      this.log(
        `⏳ 达到每分钟请求限制 (${rateLimit})，等待60秒...`,
        'warn'
      );
      await this.sleep(60000);
      this.requestsThisMinute = 0;
    }
    
    this.requestsThisMinute++;
  }

  /**
   * 估算文本的token数（简单估算）
   */
  estimateTokens(text) {
    // 简化版：英文3字符≈1token，中文1字符≈1token
    const chineseCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
    const otherCount = text.length - chineseCount;
    return Math.ceil(chineseCount + otherCount / 3);
  }

  /**
   * 解析翻译后的YAML
   */
  parseTranslatedYAML(text, section) {
    const result = new Map();
    const lines = text.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s+(.+?):\s*"(.*)"\s*$/);
      if (match) {
        const [, key, value] = match;
        result.set(key.trim(), value);
      }
    }
    
    return result;
  }

  /**
   * 合并翻译结果
   */
  async mergeResults(originalData) {
    this.translatedData = {
      platforms: new Map(originalData.platforms),
      items: new Map(originalData.items),
      recipes: new Map(originalData.recipes)
    };
    
    for (const batch of this.batches) {
      if (batch.status === 'completed' && batch.result) {
        for (const [key, value] of batch.result) {
          this.translatedData[batch.section].set(key, value);
        }
      }
    }
    
    console.log(`  已翻译 ${this.completed.length}/${this.batches.length} 批次`);
  }

  /**
   * 保存输出文件
   */
  async saveOutput() {
    // 备份原文件
    if (this.config.translation.output.backup_original && fs.existsSync(this.outputPath)) {
      const backupPath = this.outputPath.replace('.yaml', `.backup.${Date.now()}.yaml`);
      fs.copyFileSync(this.outputPath, backupPath);
      console.log(`  备份: ${path.basename(backupPath)}`);
    }
    
    // 生成YAML
    let yaml = '';
    
    // 添加元数据
    yaml += `# MC配方中文翻译\n`;
    yaml += `# 生成时间: ${new Date().toISOString()}\n`;
    yaml += `# 翻译模型: ${this.config.llm.model}\n`;
    yaml += `# 总批次: ${this.batches.length}, 成功: ${this.completed.length}, 失败: ${this.failed.length}\n`;
    yaml += `\n`;
    
    // 写入各section
    for (const [sectionName, sectionData] of Object.entries(this.translatedData)) {
      yaml += `# ========== ${sectionName} ==========\n`;
      yaml += `${sectionName}:\n`;
      
      const sorted = Array.from(sectionData.entries()).sort();
      for (const [key, value] of sorted) {
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        yaml += `  ${key}: "${escapedValue}"\n`;
      }
      yaml += `\n`;
    }
    
    fs.writeFileSync(this.outputPath, yaml, 'utf8');
    console.log(`  输出: ${this.outputPath}`);
    console.log(`  大小: ${(fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * 进度显示
   */
  startProgressDisplay() {
    this.progressInterval = setInterval(() => {
      const completed = this.progress.completed;
      const total = this.progress.total;
      const percent = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
      const inProgress = this.progress.inProgress;
      const failed = this.progress.failed;
      
      const bar = this.createProgressBar(completed, total, 30);
      
      process.stdout.write(
        `\r${colors.cyan}进度:${colors.reset} ${bar} ` +
        `${colors.bright}${completed}/${total}${colors.reset} (${percent}%) ` +
        `${colors.yellow}处理中:${inProgress}${colors.reset} ` +
        (failed > 0 ? `${colors.red}失败:${failed}${colors.reset}` : '')
      );
    }, 500);
  }

  stopProgressDisplay() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      process.stdout.write('\n');
    }
  }

  /**
   * 创建进度条
   */
  createProgressBar(current, total, width) {
    const percent = total > 0 ? current / total : 0;
    const filled = Math.floor(width * percent);
    const empty = width - filled;
    
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * 保存进度
   */
  saveProgress() {
    const progress = {
      timestamp: new Date().toISOString(),
      total: this.progress.total,
      completed: this.completed.map(id => {
        const batch = this.batches.find(b => b.id === id);
        return {
          id: batch.id,
          section: batch.section,
          result: batch.result
        };
      }),
      failed: this.failed
    };
    
    fs.writeFileSync(this.progressPath, JSON.stringify(progress, null, 2), 'utf8');
  }

  /**
   * 加载进度
   */
  loadProgress() {
    if (fs.existsSync(this.progressPath)) {
      try {
        const content = fs.readFileSync(this.progressPath, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        this.log('加载进度文件失败', 'warn');
        return null;
      }
    }
    return null;
  }

  /**
   * 打印统计
   */
  printStatistics() {
    console.log(`\n${colors.bright}📊 翻译统计：${colors.reset}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总批次：       ${this.progress.total}`);
    console.log(`${colors.green}成功：         ${this.progress.completed}${colors.reset}`);
    console.log(`${colors.red}失败：         ${this.progress.failed}${colors.reset}`);
    console.log(`成功率：       ${(this.progress.completed / this.progress.total * 100).toFixed(1)}%`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (this.failed.length > 0) {
      console.log(`\n${colors.yellow}⚠️  失败的批次：${colors.reset}`);
      for (const failedId of this.failed) {
        const batch = this.batches.find(b => b.id === failedId);
        console.log(`  批次 ${failedId}: ${batch.error}`);
      }
    }
  }

  /**
   * 日志
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const levelColors = {
      debug: colors.blue,
      info: colors.cyan,
      warn: colors.yellow,
      error: colors.red
    };
    
    const color = levelColors[level] || '';
    console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
    
    // 写入日志文件
    if (this.config.logging.save_to_file) {
      const logPath = path.join(path.dirname(this.outputPath), this.config.logging.log_file);
      const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      fs.appendFileSync(logPath, logLine, 'utf8');
    }
  }

  /**
   * 延迟
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主入口
async function main() {
  const configPath = path.join(__dirname, '../config.yaml');
  const inputPath = path.join(__dirname, '../output/lang.yaml');
  const outputPath = path.join(__dirname, '../output/lang.cn.yaml');

  // 检查依赖
  try {
    require.resolve('openai');
    require.resolve('js-yaml');
  } catch (error) {
    console.error(`${colors.red}✗ 缺少依赖包${colors.reset}`);
    console.error('请运行: npm install openai js-yaml');
    process.exit(1);
  }

  // 检查配置文件
  if (!fs.existsSync(configPath)) {
    console.error(`${colors.red}✗ 找不到配置文件${colors.reset}: ${configPath}`);
    console.error('请先配置 config.yaml');
    process.exit(1);
  }

  // 检查输入文件
  if (!fs.existsSync(inputPath)) {
    console.error(`${colors.red}✗ 找不到输入文件${colors.reset}: ${inputPath}`);
    console.error('请先运行 2-extract-lang.js');
    process.exit(1);
  }

  const translator = new AITranslator(configPath, inputPath, outputPath);
  await translator.translate();
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}✗ 未处理的错误:${colors.reset}`, error);
  process.exit(1);
});

// Ctrl+C处理
process.on('SIGINT', () => {
  console.log('\n\n⚠️  检测到中断信号，正在保存进度...');
  process.exit(0);
});

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = AITranslator;

