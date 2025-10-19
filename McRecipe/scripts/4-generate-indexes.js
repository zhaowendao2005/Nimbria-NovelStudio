#!/usr/bin/env node
/**
 * 阶段4：生成索引文件
 * 输入：recipes.cn.json
 * 输出：多个优化的索引JSON文件
 * 
 * 功能：生成针对不同场景的专用索引，支持快速查询和增量加载
 */

const fs = require('fs');
const path = require('path');

class IndexGenerator {
  constructor(inputPath, outputDir) {
    this.inputPath = inputPath;
    this.outputDir = outputDir;
    
    // 索引数据结构
    this.itemsIndex = new Map();      // 物品索引
    this.platformsIndex = new Map();  // 平台索引
    this.graphNodes = [];             // 图节点
    this.graphEdges = [];             // 图边
    this.searchIndex = {              // 搜索索引
      items: new Map(),
      recipes: new Map()
    };
  }

  /**
   * 主生成方法
   */
  async generate() {
    console.log('🔨 开始生成索引文件...');
    console.log(`📄 输入文件: ${this.inputPath}`);
    
    const startTime = Date.now();

    // 读取数据
    console.log('📖 读取配方数据...');
    const data = JSON.parse(fs.readFileSync(this.inputPath, 'utf8'));
    const recipes = data.recipes || [];

    console.log(`📦 加载了 ${recipes.length} 个配方`);

    // 第一遍：构建索引
    console.log('\n🔍 第一遍扫描：构建索引结构...');
    await this.buildIndexes(recipes);

    // 第二遍：生成关系图
    console.log('\n🕸️  第二遍扫描：构建关系图...');
    await this.buildGraph(recipes);

    // 生成所有索引文件
    console.log('\n💾 生成索引文件...');
    await this.writeItemsIndex();
    await this.writePlatformsIndex();
    await this.writeGraphIndex();
    await this.writeSearchIndex();
    await this.writeIncrementalData(recipes);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  总耗时: ${duration}秒`);
    
    this.printStatistics();
  }

  /**
   * 构建索引
   */
  async buildIndexes(recipes) {
    for (let i = 0; i < recipes.length; i++) {
      if (i % 5000 === 0 && i > 0) {
        process.stdout.write(`\r  进度: ${i}/${recipes.length}`);
      }

      const recipe = recipes[i];
      if (recipe.type === 'remove') continue;

      // 索引输出物品
      if (recipe.output && recipe.output.id) {
        this.indexItem(recipe.output.id, recipe, 'output');
      }

      // 索引输入物品
      if (recipe.inputs) {
        this.indexInputs(recipe.inputs, recipe);
      }

      // 索引平台
      if (recipe.platform) {
        this.indexPlatform(recipe.platform, recipe);
      }

      // 构建搜索索引
      this.indexForSearch(recipe);
    }
    console.log(`\r✅ 索引构建完成: ${recipes.length}/${recipes.length}`);
  }

  /**
   * 索引物品
   */
  indexItem(itemId, recipe, role) {
    if (!this.itemsIndex.has(itemId)) {
      this.itemsIndex.set(itemId, {
        id: itemId,
        asOutput: [],
        asInput: [],
        platforms: new Set()
      });
    }

    const item = this.itemsIndex.get(itemId);
    
    if (role === 'output') {
      item.asOutput.push(recipe.id);
    } else if (role === 'input') {
      item.asInput.push(recipe.id);
    }

    if (recipe.platform) {
      item.platforms.add(recipe.platform);
    }
  }

  /**
   * 递归索引输入物品
   */
  indexInputs(inputs, recipe) {
    if (!Array.isArray(inputs)) return;

    for (const element of inputs) {
      if (Array.isArray(element)) {
        this.indexInputs(element, recipe);
      } else if (element && element.id) {
        this.indexItem(element.id, recipe, 'input');
      }
    }
  }

  /**
   * 索引平台
   */
  indexPlatform(platformId, recipe) {
    if (!this.platformsIndex.has(platformId)) {
      this.platformsIndex.set(platformId, {
        id: platformId,
        recipes: [],
        itemCounts: new Map()
      });
    }

    const platform = this.platformsIndex.get(platformId);
    platform.recipes.push(recipe.id);

    // 统计物品使用次数
    if (recipe.output && recipe.output.id) {
      const count = platform.itemCounts.get(recipe.output.id) || 0;
      platform.itemCounts.set(recipe.output.id, count + 1);
    }
  }

  /**
   * 构建搜索索引
   */
  indexForSearch(recipe) {
    // 索引输出物品名称
    if (recipe.output) {
      this.addToSearchIndex('items', recipe.output.nameZh, recipe.output.id);
      this.addToSearchIndex('items', recipe.output.id, recipe.output.id);
    }

    // 索引配方标题
    if (recipe.titleZh) {
      this.addToSearchIndex('recipes', recipe.titleZh, recipe.id);
    }
    this.addToSearchIndex('recipes', recipe.id, recipe.id);
  }

  /**
   * 添加到搜索索引（分词）
   */
  addToSearchIndex(type, text, id) {
    if (!text) return;

    // 简单分词（按空格和特殊字符）
    const words = text.toLowerCase()
      .split(/[\s:_\-\/]+/)
      .filter(w => w.length > 0);

    for (const word of words) {
      if (!this.searchIndex[type].has(word)) {
        this.searchIndex[type].set(word, new Set());
      }
      this.searchIndex[type].get(word).add(id);
    }
  }

  /**
   * 构建关系图
   */
  async buildGraph(recipes) {
    const nodeMap = new Map();

    for (let i = 0; i < recipes.length; i++) {
      if (i % 5000 === 0 && i > 0) {
        process.stdout.write(`\r  进度: ${i}/${recipes.length}`);
      }

      const recipe = recipes[i];
      if (recipe.type === 'remove') continue;

      // 添加输出物品节点
      if (recipe.output && recipe.output.id) {
        if (!nodeMap.has(recipe.output.id)) {
          nodeMap.set(recipe.output.id, {
            id: recipe.output.id,
            type: 'item',
            nameZh: recipe.output.nameZh || recipe.output.id,
            platform: recipe.platform,
            isOreDict: recipe.output.isOreDict || false
          });
        }
      }

      // 添加输入物品节点和边
      this.addGraphEdges(recipe, recipe.inputs);
    }

    this.graphNodes = Array.from(nodeMap.values());
    console.log(`\r✅ 关系图构建完成: ${recipes.length}/${recipes.length}`);
  }

  /**
   * 递归添加图边
   */
  addGraphEdges(recipe, inputs) {
    if (!Array.isArray(inputs)) return;

    for (const element of inputs) {
      if (Array.isArray(element)) {
        this.addGraphEdges(recipe, element);
      } else if (element && element.id && recipe.output && recipe.output.id) {
        this.graphEdges.push({
          source: element.id,
          target: recipe.output.id,
          recipeId: recipe.id,
          platform: recipe.platform,
          recipeType: recipe.type
        });
      }
    }
  }

  /**
   * 写入物品索引
   */
  async writeItemsIndex() {
    const output = {};

    for (const [id, data] of this.itemsIndex) {
      output[id] = {
        id,
        asOutput: data.asOutput,
        asInput: data.asInput,
        platforms: Array.from(data.platforms),
        outputCount: data.asOutput.length,
        inputCount: data.asInput.length
      };
    }

    const outputPath = path.join(this.outputDir, 'items.index.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`  ✅ 物品索引: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  /**
   * 写入平台索引
   */
  async writePlatformsIndex() {
    const output = {};

    for (const [id, data] of this.platformsIndex) {
      // 获取Top 10物品
      const topItems = Array.from(data.itemCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([itemId, count]) => ({ id: itemId, count }));

      output[id] = {
        id,
        recipeCount: data.recipes.length,
        recipes: data.recipes,
        topItems
      };
    }

    const outputPath = path.join(this.outputDir, 'platforms.index.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`  ✅ 平台索引: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  /**
   * 写入关系图索引
   */
  async writeGraphIndex() {
    const output = {
      nodes: this.graphNodes,
      edges: this.graphEdges,
      statistics: {
        nodeCount: this.graphNodes.length,
        edgeCount: this.graphEdges.length
      }
    };

    const outputPath = path.join(this.outputDir, 'recipe.graph.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`  ✅ 关系图索引: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  /**
   * 写入搜索索引
   */
  async writeSearchIndex() {
    const output = {
      items: {},
      recipes: {}
    };

    // 转换Map为Object
    for (const [word, ids] of this.searchIndex.items) {
      output.items[word] = Array.from(ids);
    }

    for (const [word, ids] of this.searchIndex.recipes) {
      output.recipes[word] = Array.from(ids);
    }

    const outputPath = path.join(this.outputDir, 'search.index.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`  ✅ 搜索索引: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }

  /**
   * 写入增量数据（按平台拆分）
   */
  async writeIncrementalData(recipes) {
    console.log('  📦 生成增量数据（按平台拆分）...');

    const incrementalDir = path.join(this.outputDir, 'incremental');
    if (!fs.existsSync(incrementalDir)) {
      fs.mkdirSync(incrementalDir, { recursive: true });
    }

    // 按平台分组
    const platformRecipes = new Map();
    for (const recipe of recipes) {
      if (recipe.type === 'remove') continue;
      
      const platform = recipe.platform || 'unknown';
      if (!platformRecipes.has(platform)) {
        platformRecipes.set(platform, []);
      }
      platformRecipes.get(platform).push(recipe);
    }

    // 写入每个平台的文件
    for (const [platform, platformData] of platformRecipes) {
      const filename = `${platform}.json`;
      const filepath = path.join(incrementalDir, filename);
      
      fs.writeFileSync(
        filepath,
        JSON.stringify({ platform, recipes: platformData }, null, 2),
        'utf8'
      );
      
      const sizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
      console.log(`    - ${platform}: ${platformData.length} recipes (${sizeMB} MB)`);
    }

    console.log(`  ✅ 增量数据已生成: ${platformRecipes.size} 个平台文件`);
  }

  /**
   * 打印统计信息
   */
  printStatistics() {
    console.log('\n📊 索引统计：');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`唯一物品：     ${this.itemsIndex.size.toLocaleString()}`);
    console.log(`平台数量：     ${this.platformsIndex.size}`);
    console.log(`图节点数：     ${this.graphNodes.length.toLocaleString()}`);
    console.log(`图边数：       ${this.graphEdges.length.toLocaleString()}`);
    console.log(`搜索词条：     ${(this.searchIndex.items.size + this.searchIndex.recipes.size).toLocaleString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }
}

// 主入口
async function main() {
  const inputPath = path.join(__dirname, '../output/recipes.cn.json');
  const outputDir = path.join(__dirname, '../output');

  // 检查输入文件
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 错误：找不到输入文件 ${inputPath}`);
    console.error(`请先运行前面的脚本生成 recipes.cn.json`);
    process.exit(1);
  }

  const generator = new IndexGenerator(inputPath, outputDir);
  await generator.generate();
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

module.exports = IndexGenerator;

