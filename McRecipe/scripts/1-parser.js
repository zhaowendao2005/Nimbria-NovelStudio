#!/usr/bin/env node
/**
 * 阶段1：MC配方日志解析器
 * 输入：recipes.log
 * 输出：recipes.raw.json
 * 
 * 功能：将CraftTweaker日志转换为结构化JSON
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

class RecipeLogParser {
  constructor(logPath, outputPath) {
    this.logPath = logPath;
    this.outputPath = outputPath;
    
    this.recipes = [];
    this.itemRegistry = new Set();
    this.platformRegistry = new Set();
    this.errors = [];
    
    this.stats = {
      total: 0,
      shaped: 0,
      shapeless: 0,
      removed: 0,
      errors: 0
    };
  }

  /**
   * 主解析方法
   */
  async parse() {
    console.log('🚀 开始解析配方日志...');
    console.log(`📄 输入文件: ${this.logPath}`);
    
    const startTime = Date.now();
    let lineCount = 0;

    // 创建读取流
    const fileStream = fs.createReadStream(this.logPath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    // 逐行处理
    for await (const line of rl) {
      lineCount++;
      
      if (lineCount % 5000 === 0) {
        process.stdout.write(`\r📊 已处理 ${lineCount} 行，解析配方 ${this.recipes.length} 个...`);
      }

      // 只处理配方行
      if (line.startsWith('recipes.add')) {
        const recipe = this.parseRecipeLine(line);
        if (recipe) {
          this.recipes.push(recipe);
          this.stats[recipe.type === 'remove' ? 'removed' : recipe.type]++;
        }
      }
    }

    console.log(`\n✅ 解析完成！共处理 ${lineCount} 行`);
    
    // 生成统计数据
    this.stats.total = this.recipes.length;
    this.stats.errors = this.errors.length;

    // 写入结果
    await this.writeOutput();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  耗时: ${duration}秒`);
    
    this.printStatistics();
  }

  /**
   * 解析单行配方
   */
  parseRecipeLine(line) {
    try {
      // 提取方法类型
      const methodMatch = line.match(/^recipes\.add(Shaped|Shapeless)\(/);
      if (!methodMatch) return null;

      const type = methodMatch[1].toLowerCase();

      // 提取配方ID
      const idMatch = line.match(/^recipes\.add\w+\("([^"]+)"/);
      if (!idMatch) {
        this.logError(`无法提取配方ID`, line);
        return null;
      }
      const recipeId = idMatch[1];

      // 提取输出物品
      const outputMatch = line.match(/"[^"]+",\s*(<[^>]+>(?:\s*\*\s*\d+)?|null)/);
      if (!outputMatch) {
        this.logError(`无法提取输出物品: ${recipeId}`, line);
        return null;
      }
      
      const outputRaw = outputMatch[1];
      const output = this.parseItem(outputRaw);
      
      // 删除配方标记
      if (output === null) {
        return {
          id: recipeId,
          type: 'remove'
        };
      }

      // 提取输入材料
      const inputsMatch = line.match(/,\s*(\[.+\])\s*\);?\s*$/);
      if (!inputsMatch) {
        this.logError(`无法提取输入材料: ${recipeId}`, line);
        return null;
      }

      const inputsRaw = inputsMatch[1];
      const inputs = type === 'shaped' 
        ? this.parseShapedPattern(inputsRaw)
        : this.parseShapelessIngredients(inputsRaw);

      // 提取平台
      const platform = this.extractPlatform(recipeId);
      if (platform) {
        this.platformRegistry.add(platform);
      }

      return {
        id: recipeId,
        type,
        output,
        inputs,
        platform
      };

    } catch (error) {
      this.logError(`解析异常: ${error.message}`, line);
      return null;
    }
  }

  /**
   * 解析物品字符串
   */
  parseItem(itemStr) {
    if (itemStr === 'null' || !itemStr || itemStr.trim() === '') {
      return null;
    }

    // 提取物品ID
    const itemMatch = itemStr.match(/<([^>]+)>/);
    if (!itemMatch) return null;

    let itemId = itemMatch[1];
    this.itemRegistry.add(itemId);

    // 提取数量
    const countMatch = itemStr.match(/\*\s*(\d+)/);
    const count = countMatch ? parseInt(countMatch[1]) : 1;

    // 检查NBT
    const hasNBT = itemStr.includes('.withTag(');
    
    // 检查特殊标记
    const isOreDict = itemId.startsWith('ore:');
    const isWildcard = itemId.includes(':*');

    return {
      id: itemId,
      count,
      hasNBT,
      isOreDict,
      isWildcard
    };
  }

  /**
   * 解析有序配方的3x3矩阵
   */
  parseShapedPattern(patternStr) {
    try {
      // 简化的解析：直接提取所有物品
      const items = [];
      const itemRegex = /<[^>]+>(?:\s*\*\s*\d+)?|null/g;
      
      // 分行处理
      const rowMatches = patternStr.match(/\[[^\]]+\]/g);
      if (!rowMatches) return [];

      for (const rowStr of rowMatches) {
        const row = [];
        const matches = rowStr.matchAll(itemRegex);
        
        for (const match of matches) {
          row.push(this.parseItem(match[0]));
        }
        items.push(row);
      }

      return items;
    } catch (error) {
      this.logError(`解析shaped模式失败: ${error.message}`, patternStr);
      return [];
    }
  }

  /**
   * 解析无序配方的材料列表
   */
  parseShapelessIngredients(ingredientsStr) {
    try {
      const items = [];
      const itemRegex = /<[^>]+>(?:\s*\*\s*\d+)?/g;
      
      const matches = ingredientsStr.matchAll(itemRegex);
      for (const match of matches) {
        const item = this.parseItem(match[0]);
        if (item) {
          items.push(item);
        }
      }

      return items;
    } catch (error) {
      this.logError(`解析shapeless材料失败: ${error.message}`, ingredientsStr);
      return [];
    }
  }

  /**
   * 从配方ID提取平台
   */
  extractPlatform(recipeId) {
    // 格式通常是 "modid:recipe_name"
    const match = recipeId.match(/^([^:]+):/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 记录错误
   */
  logError(message, context = '') {
    this.errors.push({
      message,
      context: context.substring(0, 200)
    });
    this.stats.errors++;
  }

  /**
   * 写入输出文件
   */
  async writeOutput() {
    console.log('\n💾 正在写入输出文件...');
    
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: path.basename(this.logPath),
        parser: 'RecipeLogParser v1.0'
      },
      statistics: {
        ...this.stats,
        uniqueItems: this.itemRegistry.size,
        platforms: Array.from(this.platformRegistry).sort()
      },
      recipes: this.recipes
    };

    // 写入主文件
    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`✅ 输出文件已保存: ${this.outputPath}`);
    console.log(`📦 文件大小: ${(fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2)} MB`);

    // 如果有错误，写入错误日志
    if (this.errors.length > 0) {
      const errorPath = this.outputPath.replace('.json', '.errors.json');
      fs.writeFileSync(
        errorPath,
        JSON.stringify(this.errors, null, 2),
        'utf8'
      );
      console.log(`⚠️  错误日志已保存: ${errorPath}`);
    }
  }

  /**
   * 打印统计信息
   */
  printStatistics() {
    console.log('\n📊 解析统计：');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总配方数：     ${this.stats.total.toLocaleString()}`);
    console.log(`  有序合成：   ${this.stats.shaped.toLocaleString()}`);
    console.log(`  无序合成：   ${this.stats.shapeless.toLocaleString()}`);
    console.log(`  删除标记：   ${this.stats.removed.toLocaleString()}`);
    console.log(`唯一物品：     ${this.itemRegistry.size.toLocaleString()}`);
    console.log(`模组平台：     ${this.platformRegistry.size}`);
    console.log(`解析错误：     ${this.stats.errors.toLocaleString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    if (this.platformRegistry.size > 0) {
      console.log('\n🎮 检测到的模组平台：');
      const platforms = Array.from(this.platformRegistry).sort();
      platforms.slice(0, 10).forEach(p => console.log(`  - ${p}`));
      if (platforms.length > 10) {
        console.log(`  ... 还有 ${platforms.length - 10} 个平台`);
      }
    }
  }
}

// 主入口
async function main() {
  const logPath = path.join(__dirname, '../recipes.log');
  const outputPath = path.join(__dirname, '../output/recipes.raw.json');

  // 检查输入文件
  if (!fs.existsSync(logPath)) {
    console.error(`❌ 错误：找不到输入文件 ${logPath}`);
    process.exit(1);
  }

  const parser = new RecipeLogParser(logPath, outputPath);
  await parser.parse();
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

module.exports = RecipeLogParser;

