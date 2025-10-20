#!/usr/bin/env node
/**
 * 阶段2：提取翻译键（按值去重版）
 * 输入：recipes.raw.json
 * 输出：lang.yaml（英文名称去重）
 *       lang.mapping.json（原始ID到英文名称的映射）
 * 
 * 功能：
 * 1. 从配方数据中提取所有ID和对应的显示名称
 * 2. 按照显示名称去重（不同ID可能有相同的显示名称）
 * 3. 输出 英文名称:英文名称 供AI翻译成 英文名称:中文名称
 * 4. 保存ID->英文名称的映射，用于后续合并
 */

const fs = require('fs');
const path = require('path');

class LanguageExtractor {
  constructor(inputPath, outputPath, mappingPath) {
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    this.mappingPath = mappingPath;
    
    // 唯一英文名称集合（去重）
    this.uniqueNames = {
      platforms: new Set(),
      items: new Set(),
      recipes: new Set()
    };
    
    // 映射：原始ID -> 英文名称
    this.idToName = {
      platforms: new Map(),
      items: new Map(),
      recipes: new Map()
    };
  }

  /**
   * 主提取方法
   */
  async extract() {
    console.log('🔍 开始提取翻译键（按值去重）...');
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
        const name = this.idToDisplayName(recipe.id);
        this.idToName.recipes.set(recipe.id, name);
        this.uniqueNames.recipes.add(name);
      }

      // 提取平台
      if (recipe.platform) {
        const name = this.idToDisplayName(recipe.platform);
        this.idToName.platforms.set(recipe.platform, name);
        this.uniqueNames.platforms.add(name);
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

    // 写入YAML（去重后的英文名称）
    await this.writeYAML();
    
    // 写入映射文件
    await this.writeMapping();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  耗时: ${duration}秒`);
    
    this.printStatistics();
  }

  /**
   * 提取物品信息
   */
  extractItem(item) {
    if (!item || !item.id) return;
    
    const name = this.idToDisplayName(item.id);
    this.idToName.items.set(item.id, name);
    this.uniqueNames.items.add(name);
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
   * 将ID转换为可读的显示名称
   * 例如：
   *   "minecraft:iron_ingot" -> "Iron Ingot"
   *   "gregtech:meta_item_1:32600" -> "Meta Item 1 32600"
   *   "ore:ingotIron" -> "Ingot Iron"
   */
  idToDisplayName(id) {
    if (!id) return '';

    // 处理矿物词典
    if (id.startsWith('ore:')) {
      const name = id.substring(4);
      return this.formatName(name);
    }

    // 分割模组ID和物品名
    const parts = id.split(':');
    if (parts.length >= 2) {
      // 跳过第一部分（模组ID），格式化剩余部分
      const itemParts = parts.slice(1).map(p => this.formatName(p));
      return itemParts.join(' ');
    }

    return this.formatName(id);
  }

  /**
   * 格式化名称：下划线/驼峰 -> 标题格式
   */
  formatName(name) {
    return name
      // 移除特殊字符（但保留字母数字和空格）
      .replace(/[*]/g, '')
      // 下划线转空格
      .replace(/_/g, ' ')
      // 驼峰拆分
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // 首字母大写
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * 写入YAML文件（去重后的英文名称）
   */
  async writeYAML() {
    console.log('\n💾 正在生成YAML文件（去重后）...');

    let yaml = '';

    // 元数据
    yaml += `# MC配方翻译文件（去重版）\n`;
    yaml += `# 生成时间: ${new Date().toISOString()}\n`;
    yaml += `# 说明：本文件只包含去重后的唯一英文名称\n`;
    yaml += `# 格式：英文名称: "英文名称"  --> 请翻译为 --> 英文名称: "中文名称"\n`;
    yaml += `# 唯一物品名称: ${this.uniqueNames.items.size}\n`;
    yaml += `# 唯一平台名称: ${this.uniqueNames.platforms.size}\n`;
    yaml += `# 唯一配方名称: ${this.uniqueNames.recipes.size}\n`;
    yaml += `\n`;

    // 平台翻译
    yaml += `# ========== 平台翻译 ==========\n`;
    yaml += `platforms:\n`;
    const sortedPlatforms = Array.from(this.uniqueNames.platforms).sort();
    for (const name of sortedPlatforms) {
      yaml += `  ${this.escapeYAMLKey(name)}: "${this.escapeYAMLValue(name)}"\n`;
    }
    yaml += `\n`;

    // 物品翻译
    yaml += `# ========== 物品翻译 ==========\n`;
    yaml += `items:\n`;
    const sortedItems = Array.from(this.uniqueNames.items).sort();
    for (const name of sortedItems) {
      yaml += `  ${this.escapeYAMLKey(name)}: "${this.escapeYAMLValue(name)}"\n`;
    }
    yaml += `\n`;

    // 配方翻译（前1000个）
    yaml += `# ========== 配方翻译（可选） ==========\n`;
    yaml += `recipes:\n`;
    const sortedRecipes = Array.from(this.uniqueNames.recipes).sort();
    const recipesToInclude = sortedRecipes.slice(0, 1000);
    for (const name of recipesToInclude) {
      yaml += `  ${this.escapeYAMLKey(name)}: "${this.escapeYAMLValue(name)}"\n`;
    }
    if (sortedRecipes.length > 1000) {
      yaml += `  # ... 省略 ${sortedRecipes.length - 1000} 个配方（通常不需要翻译）\n`;
    }

    // 写入文件
    fs.writeFileSync(this.outputPath, yaml, 'utf8');

    console.log(`✅ YAML文件已保存: ${this.outputPath}`);
    console.log(`📦 文件大小: ${(fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * 写入映射文件（用于后续合并）
   */
  async writeMapping() {
    console.log('\n💾 正在生成映射文件...');

    const mapping = {
      meta: {
        generatedAt: new Date().toISOString(),
        description: '原始ID到英文显示名称的映射'
      },
      platforms: Object.fromEntries(this.idToName.platforms),
      items: Object.fromEntries(this.idToName.items),
      recipes: Object.fromEntries(this.idToName.recipes)
    };

    fs.writeFileSync(this.mappingPath, JSON.stringify(mapping, null, 2), 'utf8');

    console.log(`✅ 映射文件已保存: ${this.mappingPath}`);
    console.log(`📦 文件大小: ${(fs.statSync(this.mappingPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * YAML键转义（用作键时）
   */
  escapeYAMLKey(str) {
    if (!str) return '""';
    
    // 如果包含特殊字符，需要引号
    if (/[:\{\}\[\],&*#?|\-<>=!%@`]/.test(str)) {
      return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    
    return str;
  }

  /**
   * YAML值转义（引号内）
   */
  escapeYAMLValue(str) {
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
    const totalIds = this.idToName.platforms.size + this.idToName.items.size + this.idToName.recipes.size;
    const totalUniqueNames = this.uniqueNames.platforms.size + this.uniqueNames.items.size + this.uniqueNames.recipes.size;
    const deduplication = totalIds - totalUniqueNames;
    const deduplicationPercent = totalIds > 0 ? ((deduplication / totalIds) * 100).toFixed(1) : 0;

    console.log('\n📊 提取统计：');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`原始ID总数：   ${totalIds.toLocaleString()}`);
    console.log(`  - 平台：     ${this.idToName.platforms.size}`);
    console.log(`  - 物品：     ${this.idToName.items.size.toLocaleString()}`);
    console.log(`  - 配方：     ${this.idToName.recipes.size.toLocaleString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`唯一名称数：   ${totalUniqueNames.toLocaleString()}`);
    console.log(`  - 平台：     ${this.uniqueNames.platforms.size}`);
    console.log(`  - 物品：     ${this.uniqueNames.items.size.toLocaleString()}`);
    console.log(`  - 配方：     ${this.uniqueNames.recipes.size.toLocaleString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✨ 去重效果：   减少 ${deduplication.toLocaleString()} 个 (${deduplicationPercent}%)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // 显示平台列表
    console.log('\n🎮 平台列表：');
    const platforms = Array.from(this.uniqueNames.platforms).sort();
    platforms.forEach(p => console.log(`  - ${p}`));

    // 估算翻译成本（基于去重后的数量）
    const avgTokensPerItem = 15;
    const totalTokens = totalUniqueNames * avgTokensPerItem * 2; // 输入+输出
    const estimatedCost = (totalTokens / 1000000) * 0.15; // GPT-4o-mini价格

    console.log('\n💰 翻译成本估算（GPT-4o-mini，去重后）：');
    console.log(`  预计Token数：  ${totalTokens.toLocaleString()}`);
    console.log(`  预计费用：     $${estimatedCost.toFixed(3)}`);
    console.log(`  💡 通过去重节省了 ${deduplicationPercent}% 的翻译成本！`);
  }
}

// 主入口
async function main() {
  const inputPath = path.join(__dirname, '../output/recipes.raw.json');
  const outputPath = path.join(__dirname, '../output/lang.yaml');
  const mappingPath = path.join(__dirname, '../output/lang.mapping.json');

  // 检查输入文件
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 错误：找不到输入文件 ${inputPath}`);
    console.error(`请先运行 1-parser.js 生成 recipes.raw.json`);
    process.exit(1);
  }

  const extractor = new LanguageExtractor(inputPath, outputPath, mappingPath);
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
