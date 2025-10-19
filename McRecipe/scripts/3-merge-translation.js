#!/usr/bin/env node
/**
 * 阶段3：合并翻译
 * 输入：recipes.raw.json + lang.cn.yaml
 * 输出：recipes.cn.json
 * 
 * 功能：将中文翻译映射到配方数据中
 */

const fs = require('fs');
const path = require('path');

class TranslationMerger {
  constructor(recipesPath, langPath, outputPath) {
    this.recipesPath = recipesPath;
    this.langPath = langPath;
    this.outputPath = outputPath;
    
    this.translations = {
      items: new Map(),
      recipes: new Map(),
      platforms: new Map()
    };
    
    this.stats = {
      totalRecipes: 0,
      translatedItems: 0,
      translatedRecipes: 0,
      translatedPlatforms: 0,
      untranslatedItems: 0
    };
  }

  /**
   * 主合并方法
   */
  async merge() {
    console.log('🔄 开始合并翻译...');
    
    const startTime = Date.now();

    // 1. 读取翻译文件
    console.log('📖 读取翻译文件...');
    this.loadTranslations();

    // 2. 读取配方数据
    console.log('📖 读取配方数据...');
    const data = JSON.parse(fs.readFileSync(this.recipesPath, 'utf8'));
    const recipes = data.recipes || [];

    this.stats.totalRecipes = recipes.length;
    console.log(`📦 加载了 ${recipes.length} 个配方`);

    // 3. 合并翻译
    console.log('🔄 正在合并翻译...');
    const translatedRecipes = recipes.map((recipe, index) => {
      if (index % 5000 === 0 && index > 0) {
        process.stdout.write(`\r  处理进度: ${index}/${recipes.length}`);
      }
      return this.translateRecipe(recipe);
    });
    console.log(`\r✅ 处理完成: ${recipes.length}/${recipes.length}`);

    // 4. 写入结果
    await this.writeOutput(data, translatedRecipes);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  耗时: ${duration}秒`);
    
    this.printStatistics();
  }

  /**
   * 加载YAML翻译文件
   */
  loadTranslations() {
    if (!fs.existsSync(this.langPath)) {
      console.warn(`⚠️  警告：找不到翻译文件 ${this.langPath}`);
      console.warn(`将使用原始英文名称`);
      return;
    }

    const content = fs.readFileSync(this.langPath, 'utf8');
    const lines = content.split('\n');
    
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
        this.translations[currentSection].set(key.trim(), value);
      }
    }

    console.log(`✅ 加载翻译：`);
    console.log(`   平台: ${this.translations.platforms.size}`);
    console.log(`   物品: ${this.translations.items.size}`);
    console.log(`   配方: ${this.translations.recipes.size}`);
  }

  /**
   * 翻译单个配方
   */
  translateRecipe(recipe) {
    if (!recipe) return recipe;

    const translated = { ...recipe };

    // 翻译配方标题
    if (recipe.id && this.translations.recipes.has(recipe.id)) {
      translated.titleZh = this.translations.recipes.get(recipe.id);
      this.stats.translatedRecipes++;
    }

    // 翻译平台
    if (recipe.platform && this.translations.platforms.has(recipe.platform)) {
      translated.platformZh = this.translations.platforms.get(recipe.platform);
      this.stats.translatedPlatforms++;
    }

    // 翻译输出物品
    if (recipe.output) {
      translated.output = this.translateItem(recipe.output);
    }

    // 翻译输入物品
    if (recipe.inputs) {
      translated.inputs = this.translateInputs(recipe.inputs);
    }

    return translated;
  }

  /**
   * 翻译物品
   */
  translateItem(item) {
    if (!item || !item.id) return item;

    const translated = { ...item };
    
    if (this.translations.items.has(item.id)) {
      translated.nameZh = this.translations.items.get(item.id);
      this.stats.translatedItems++;
    } else {
      this.stats.untranslatedItems++;
    }

    return translated;
  }

  /**
   * 递归翻译输入数组
   */
  translateInputs(inputs) {
    if (!Array.isArray(inputs)) return inputs;

    return inputs.map(element => {
      if (Array.isArray(element)) {
        return this.translateInputs(element);
      } else if (element && typeof element === 'object' && element.id) {
        return this.translateItem(element);
      }
      return element;
    });
  }

  /**
   * 写入输出文件
   */
  async writeOutput(originalData, translatedRecipes) {
    console.log('\n💾 正在写入输出文件...');

    const output = {
      metadata: {
        ...originalData.metadata,
        translatedAt: new Date().toISOString(),
        translationSource: path.basename(this.langPath),
        merger: 'TranslationMerger v1.0'
      },
      statistics: {
        ...originalData.statistics,
        translation: {
          translatedItems: this.stats.translatedItems,
          translatedRecipes: this.stats.translatedRecipes,
          translatedPlatforms: this.stats.translatedPlatforms,
          untranslatedItems: this.stats.untranslatedItems
        }
      },
      recipes: translatedRecipes
    };

    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`✅ 输出文件已保存: ${this.outputPath}`);
    console.log(`📦 文件大小: ${(fs.statSync(this.outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  }

  /**
   * 打印统计信息
   */
  printStatistics() {
    console.log('\n📊 合并统计：');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总配方数：     ${this.stats.totalRecipes.toLocaleString()}`);
    console.log(`已翻译配方：   ${this.stats.translatedRecipes.toLocaleString()}`);
    console.log(`已翻译物品：   ${this.stats.translatedItems.toLocaleString()}`);
    console.log(`未翻译物品：   ${this.stats.untranslatedItems.toLocaleString()}`);
    console.log(`已翻译平台：   ${this.stats.translatedPlatforms.toLocaleString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // 计算覆盖率
    const totalItems = this.stats.translatedItems + this.stats.untranslatedItems;
    const coverage = totalItems > 0 ? (this.stats.translatedItems / totalItems * 100).toFixed(1) : 0;
    
    console.log(`\n📈 翻译覆盖率：`);
    console.log(`  物品覆盖率：  ${coverage}%`);
    
    if (this.stats.untranslatedItems > 0) {
      console.log(`\n💡 提示：还有 ${this.stats.untranslatedItems} 个物品未翻译`);
      console.log(`   建议完善 lang.cn.yaml 文件以提高覆盖率`);
    }
  }
}

// 主入口
async function main() {
  const recipesPath = path.join(__dirname, '../output/recipes.raw.json');
  const langPath = path.join(__dirname, '../output/lang.cn.yaml');
  const outputPath = path.join(__dirname, '../output/recipes.cn.json');

  // 检查输入文件
  if (!fs.existsSync(recipesPath)) {
    console.error(`❌ 错误：找不到配方文件 ${recipesPath}`);
    console.error(`请先运行 1-parser.js`);
    process.exit(1);
  }

  const merger = new TranslationMerger(recipesPath, langPath, outputPath);
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

