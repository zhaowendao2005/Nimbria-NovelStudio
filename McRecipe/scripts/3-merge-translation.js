#!/usr/bin/env node
/**
 * 阶段3：合并翻译结果
 * 输入：recipes.raw.json（原始配方）
 *       lang.cn.yaml（AI翻译后的中文）
 *       lang.mapping.json（ID到英文名称的映射）
 * 输出：recipes.cn.json（带有中文名称的配方）
 * 
 * 功能：
 * 1. 加载翻译映射（英文名称 -> 中文名称）
 * 2. 使用lang.mapping.json将原始ID映射到英文名称
 * 3. 查找对应的中文翻译
 * 4. 为每个ID添加对应的中文字段
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class TranslationMerger {
  constructor(recipesPath, translationPath, mappingPath, outputPath) {
    this.recipesPath = recipesPath;
    this.translationPath = translationPath;
    this.mappingPath = mappingPath;
    this.outputPath = outputPath;
    
    // 翻译映射：英文名称 -> 中文名称
    this.translations = {
      platforms: new Map(),
      items: new Map(),
      recipes: new Map()
    };
    
    // ID映射：原始ID -> 英文名称
    this.idMapping = {
      platforms: new Map(),
      items: new Map(),
      recipes: new Map()
    };
    
    // 统计
    this.stats = {
      totalRecipes: 0,
      translatedPlatforms: 0,
      translatedItems: 0,
      translatedRecipes: 0,
      missingTranslations: []
    };
  }

  /**
   * 主合并方法
   */
  async merge() {
    console.log('🔀 开始合并翻译...');
    const startTime = Date.now();

    try {
      // 1. 加载映射文件
      console.log(`📋 加载映射文件...`);
      this.loadMapping();
      
      // 2. 加载翻译文件
      console.log(`📖 加载翻译文件...`);
      this.loadTranslations();
      
      // 3. 加载原始配方
      console.log(`📦 加载原始配方...`);
      const recipes = this.loadRecipes();
      
      // 4. 合并翻译
      console.log(`🔗 合并翻译结果...`);
      const mergedRecipes = this.mergeTranslations(recipes);
      
      // 5. 保存输出
      console.log(`💾 保存输出文件...`);
      this.saveOutput(mergedRecipes);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ 合并完成！耗时: ${duration}秒`);
      
      this.printStatistics();
      
    } catch (error) {
      console.error(`\n❌ 合并失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 加载ID映射文件
   */
  loadMapping() {
    if (!fs.existsSync(this.mappingPath)) {
      console.warn(`⚠️  映射文件不存在: ${this.mappingPath}`);
      console.warn(`请先运行 2-extract-lang.js`);
      return;
    }

    const mapping = JSON.parse(fs.readFileSync(this.mappingPath, 'utf8'));

    this.idMapping.platforms = new Map(Object.entries(mapping.platforms || {}));
    this.idMapping.items = new Map(Object.entries(mapping.items || {}));
    this.idMapping.recipes = new Map(Object.entries(mapping.recipes || {}));

    console.log(`  平台映射: ${this.idMapping.platforms.size}`);
    console.log(`  物品映射: ${this.idMapping.items.size}`);
    console.log(`  配方映射: ${this.idMapping.recipes.size}`);
  }

  /**
   * 加载翻译文件（YAML）
   */
  loadTranslations() {
    if (!fs.existsSync(this.translationPath)) {
      console.warn(`⚠️  翻译文件不存在: ${this.translationPath}`);
      console.warn(`请先运行 AI翻译脚本或手动创建 lang.cn.yaml`);
      return;
    }

    const content = fs.readFileSync(this.translationPath, 'utf8');
    const translated = yaml.load(content);

    // 提取各section
    if (translated.platforms) {
      for (const [enName, cnName] of Object.entries(translated.platforms)) {
        this.translations.platforms.set(enName, cnName);
      }
    }

    if (translated.items) {
      for (const [enName, cnName] of Object.entries(translated.items)) {
        this.translations.items.set(enName, cnName);
      }
    }

    if (translated.recipes) {
      for (const [enName, cnName] of Object.entries(translated.recipes)) {
        this.translations.recipes.set(enName, cnName);
      }
    }

    console.log(`  平台翻译: ${this.translations.platforms.size}`);
    console.log(`  物品翻译: ${this.translations.items.size}`);
    console.log(`  配方翻译: ${this.translations.recipes.size}`);
  }

  /**
   * 加载原始配方文件
   */
  loadRecipes() {
    if (!fs.existsSync(this.recipesPath)) {
      throw new Error(`找不到配方文件: ${this.recipesPath}`);
    }

    const content = fs.readFileSync(this.recipesPath, 'utf8');
    const data = JSON.parse(content);

    this.stats.totalRecipes = data.recipes?.length || 0;
    console.log(`  加载了 ${this.stats.totalRecipes.toLocaleString()} 个配方`);

    return data;
  }

  /**
   * 合并翻译到配方
   */
  mergeTranslations(data) {
    const recipes = data.recipes || [];

    for (const recipe of recipes) {
      // 跳过删除标记
      if (recipe.type === 'remove') continue;

      // 翻译平台
      if (recipe.platform) {
        const enName = this.idMapping.platforms.get(recipe.platform);
        if (enName && this.translations.platforms.has(enName)) {
          recipe.platformCn = this.translations.platforms.get(enName);
          this.stats.translatedPlatforms++;
        } else {
          this.recordMissing('platform', recipe.platform, enName);
        }
      }

      // 翻译配方ID
      if (recipe.id) {
        const enName = this.idMapping.recipes.get(recipe.id);
        if (enName && this.translations.recipes.has(enName)) {
          recipe.idCn = this.translations.recipes.get(enName);
          this.stats.translatedRecipes++;
        }
      }

      // 翻译输出物品
      if (recipe.output) {
        this.translateItem(recipe.output);
      }

      // 翻译输入物品
      if (recipe.inputs && Array.isArray(recipe.inputs)) {
        this.translateItemsArray(recipe.inputs);
      }
    }

    return data;
  }

  /**
   * 翻译单个物品
   */
  translateItem(item) {
    if (!item || !item.id) return;

    const enName = this.idMapping.items.get(item.id);
    if (enName && this.translations.items.has(enName)) {
      item.nameCn = this.translations.items.get(enName);
      this.stats.translatedItems++;
    } else if (enName) {
      this.recordMissing('item', item.id, enName);
    }
  }

  /**
   * 递归翻译物品数组
   */
  translateItemsArray(arr) {
    for (const element of arr) {
      if (Array.isArray(element)) {
        this.translateItemsArray(element);
      } else if (element && typeof element === 'object') {
        this.translateItem(element);
      }
    }
  }

  /**
   * 记录缺失的翻译
   */
  recordMissing(type, id, enName) {
    if (this.stats.missingTranslations.length < 100) {
      this.stats.missingTranslations.push({
        type,
        id,
        enName: enName || '(未找到映射)'
      });
    }
  }

  /**
   * 保存输出文件
   */
  saveOutput(data) {
    // 备份原文件
    if (fs.existsSync(this.outputPath)) {
      const backupPath = this.outputPath.replace('.json', `.backup.${Date.now()}.json`);
      fs.copyFileSync(this.outputPath, backupPath);
      console.log(`  备份: ${path.basename(backupPath)}`);
    }

    // 写入文件
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(this.outputPath, jsonStr, 'utf8');

    console.log(`✅ 输出文件: ${this.outputPath}`);
    console.log(`📦 文件大小: ${(fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * 打印统计信息
   */
  printStatistics() {
    console.log('\n📊 合并统计：');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总配方数：       ${this.stats.totalRecipes.toLocaleString()}`);
    console.log(`已翻译平台：     ${this.stats.translatedPlatforms}`);
    console.log(`已翻译物品：     ${this.stats.translatedItems.toLocaleString()}`);
    console.log(`已翻译配方：     ${this.stats.translatedRecipes.toLocaleString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (this.stats.missingTranslations.length > 0) {
      console.log(`\n⚠️  缺失的翻译（前100个）：`);
      for (const missing of this.stats.missingTranslations.slice(0, 20)) {
        console.log(`  [${missing.type}] ${missing.id} -> ${missing.enName}`);
      }
      if (this.stats.missingTranslations.length > 20) {
        console.log(`  ... 还有 ${this.stats.missingTranslations.length - 20} 个缺失项`);
      }
    }
  }
}

// 主入口
async function main() {
  const recipesPath = path.join(__dirname, '../output/recipes.raw.json');
  const translationPath = path.join(__dirname, '../output/lang.cn.yaml');
  const mappingPath = path.join(__dirname, '../output/lang.mapping.json');
  const outputPath = path.join(__dirname, '../output/recipes.cn.json');

  // 检查依赖
  try {
    require.resolve('js-yaml');
  } catch (error) {
    console.error(`❌ 缺少依赖: js-yaml`);
    console.error('请运行: npm install js-yaml');
    process.exit(1);
  }

  // 检查必需文件
  if (!fs.existsSync(recipesPath)) {
    console.error(`❌ 错误：找不到 ${recipesPath}`);
    console.error('请先运行 1-parser.js');
    process.exit(1);
  }

  if (!fs.existsSync(mappingPath)) {
    console.error(`❌ 错误：找不到 ${mappingPath}`);
    console.error('请先运行 2-extract-lang.js');
    process.exit(1);
  }

  if (!fs.existsSync(translationPath)) {
    console.error(`❌ 错误：找不到 ${translationPath}`);
    console.error('请先运行 AI翻译脚本或手动创建翻译文件');
    process.exit(1);
  }

  const merger = new TranslationMerger(recipesPath, translationPath, mappingPath, outputPath);
  await merger.merge();
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

module.exports = TranslationMerger;

