#!/usr/bin/env node
/**
 * 阶段2：提取翻译键
 * 输入：recipes.raw.json
 * 输出：lang.yaml
 * 
 * 功能：从配方数据中提取所有需要翻译的内容，去重后生成YAML
 */

const fs = require('fs');
const path = require('path');

class LanguageExtractor {
  constructor(inputPath, outputPath) {
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    
    this.items = new Map();      // 物品ID -> 英文名
    this.recipes = new Map();    // 配方ID -> 英文名
    this.platforms = new Map();  // 平台ID -> 英文名
  }

  /**
   * 主提取方法
   */
  async extract() {
    console.log('🔍 开始提取翻译键...');
    console.log(`📄 输入文件: ${this.inputPath}`);
    
    const startTime = Date.now();

    // 读取数据
    const data = JSON.parse(fs.readFileSync(this.inputPath, 'utf8'));
    const recipes = data.recipes || [];

    console.log(`📦 加载了 ${recipes.length} 个配方`);

    // 遍历所有配方
    for (const recipe of recipes) {
      // 跳过删除标记
      if (recipe.type === 'remove') continue;

      // 提取配方ID
      if (recipe.id) {
        this.recipes.set(recipe.id, this.idToName(recipe.id));
      }

      // 提取平台
      if (recipe.platform) {
        this.platforms.set(
          recipe.platform,
          this.idToName(recipe.platform)
        );
      }

      // 提取输出物品
      if (recipe.output) {
        this.extractItem(recipe.output);
      }

      // 提取输入物品
      if (recipe.inputs) {
        if (Array.isArray(recipe.inputs)) {
          this.extractItemsFromArray(recipe.inputs);
        }
      }
    }

    // 写入YAML
    await this.writeYAML();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  耗时: ${duration}秒`);
    
    this.printStatistics();
  }

  /**
   * 提取物品信息
   */
  extractItem(item) {
    if (!item || !item.id) return;
    
    if (!this.items.has(item.id)) {
      this.items.set(item.id, this.idToName(item.id));
    }
  }

  /**
   * 递归提取数组中的物品
   */
  extractItemsFromArray(arr) {
    for (const element of arr) {
      if (Array.isArray(element)) {
        this.extractItemsFromArray(element);
      } else if (element && typeof element === 'object') {
        this.extractItem(element);
      }
    }
  }

  /**
   * 将ID转换为可读名称（占位英文）
   */
  idToName(id) {
    if (!id) return '';

    // 处理矿物词典
    if (id.startsWith('ore:')) {
      const name = id.substring(4);
      return this.formatName(name) + ' (Ore Dict)';
    }

    // 分割模组ID和物品名
    const parts = id.split(':');
    if (parts.length >= 2) {
      const itemName = parts.slice(1).join(':');
      return this.formatName(itemName);
    }

    return this.formatName(id);
  }

  /**
   * 格式化名称：下划线/驼峰 -> 标题格式
   */
  formatName(name) {
    return name
      // 移除数字后缀和特殊字符
      .replace(/[:*]/g, ' ')
      // 下划线转空格
      .replace(/_/g, ' ')
      // 驼峰拆分
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // 首字母大写
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * 写入YAML文件
   */
  async writeYAML() {
    console.log('\n💾 正在生成YAML文件...');

    let yaml = '';

    // 元数据
    yaml += `# MC配方翻译文件\n`;
    yaml += `# 生成时间: ${new Date().toISOString()}\n`;
    yaml += `# 总物品数: ${this.items.size}\n`;
    yaml += `# 总配方数: ${this.recipes.size}\n`;
    yaml += `# 总平台数: ${this.platforms.size}\n`;
    yaml += `\n`;

    // 平台翻译
    yaml += `# ========== 平台翻译 ==========\n`;
    yaml += `platforms:\n`;
    const sortedPlatforms = Array.from(this.platforms.entries()).sort();
    for (const [id, name] of sortedPlatforms) {
      yaml += `  ${this.escapeYAML(id)}: "${this.escapeYAML(name)}"\n`;
    }
    yaml += `\n`;

    // 物品翻译（分批写入，避免单个section太大）
    yaml += `# ========== 物品翻译 ==========\n`;
    yaml += `items:\n`;
    const sortedItems = Array.from(this.items.entries()).sort();
    for (const [id, name] of sortedItems) {
      yaml += `  ${this.escapeYAML(id)}: "${this.escapeYAML(name)}"\n`;
    }
    yaml += `\n`;

    // 配方翻译（只保留前1000个，太多了）
    yaml += `# ========== 配方翻译（示例） ==========\n`;
    yaml += `# 注意：配方标题通常可以从物品名称推导，这里只列出特殊情况\n`;
    yaml += `recipes:\n`;
    const sortedRecipes = Array.from(this.recipes.entries()).sort();
    for (const [id, name] of sortedRecipes.slice(0, 1000)) {
      yaml += `  ${this.escapeYAML(id)}: "${this.escapeYAML(name)}"\n`;
    }
    if (sortedRecipes.length > 1000) {
      yaml += `  # ... 省略 ${sortedRecipes.length - 1000} 个配方\n`;
    }

    // 写入文件
    fs.writeFileSync(this.outputPath, yaml, 'utf8');

    console.log(`✅ YAML文件已保存: ${this.outputPath}`);
    console.log(`📦 文件大小: ${(fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * YAML转义
   */
  escapeYAML(str) {
    if (!str) return '';
    return str.toString()
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  /**
   * 打印统计信息
   */
  printStatistics() {
    console.log('\n📊 提取统计：');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`唯一物品：     ${this.items.size.toLocaleString()}`);
    console.log(`唯一配方：     ${this.recipes.size.toLocaleString()}`);
    console.log(`唯一平台：     ${this.platforms.size}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // 显示平台列表
    console.log('\n🎮 平台列表：');
    const platforms = Array.from(this.platforms.keys()).sort();
    platforms.forEach(p => console.log(`  - ${p}`));

    // 估算翻译成本
    const avgTokensPerItem = 15;
    const totalTokens = this.items.size * avgTokensPerItem;
    const estimatedCost = (totalTokens / 1000000) * 0.15; // GPT-4o-mini价格

    console.log('\n💰 翻译成本估算（GPT-4o-mini）：');
    console.log(`  预计Token数：  ${totalTokens.toLocaleString()}`);
    console.log(`  预计费用：     $${estimatedCost.toFixed(3)}`);
    console.log(`  建议分批：     ${Math.ceil(this.items.size / 500)} 批（每批500个）`);
  }
}

// 主入口
async function main() {
  const inputPath = path.join(__dirname, '../output/recipes.raw.json');
  const outputPath = path.join(__dirname, '../output/lang.yaml');

  // 检查输入文件
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 错误：找不到输入文件 ${inputPath}`);
    console.error(`请先运行 1-parser.js 生成 recipes.raw.json`);
    process.exit(1);
  }

  const extractor = new LanguageExtractor(inputPath, outputPath);
  await extractor.extract();
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

module.exports = LanguageExtractor;

