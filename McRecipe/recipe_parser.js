/**
 * CraftTweaker配方解析器
 * 将 recipes.log 文件中的配方转换为JSON格式
 */

class RecipeParser {
    constructor() {
        this.recipes = [];
        this.stats = {
            shaped: 0,
            shapeless: 0,
            invalid: 0,
            total: 0
        };
    }

    /**
     * 解析单个物品字符串
     * 例: <minecraft:stone> 或 <minecraft:stone:1> * 2
     */
    parseItem(itemString) {
        if (!itemString || itemString.trim() === 'null') {
            return null;
        }

        // 清理字符串
        itemString = itemString.trim();

        // 匹配物品格式: <modid:item:meta> * count 或 <modid:item> * count
        const itemMatch = itemString.match(/<([^>]+)>(?:\s*\*\s*(\d+))?/);
        
        if (!itemMatch) {
            return itemString; // 返回原始字符串，可能是矿物辞典等
        }

        const fullItemName = itemMatch[1];
        const count = itemMatch[2] ? parseInt(itemMatch[2]) : 1;

        // 分割 modid:item:meta
        const parts = fullItemName.split(':');
        const modid = parts[0];
        const itemName = parts[1];
        const meta = parts[2] || '0';

        return {
            modid,
            item: itemName,
            meta,
            count,
            fullName: fullItemName
        };
    }

    /**
     * 解析配方输入数组
     * 处理嵌套数组格式: [[item1, item2], [item3, null]]
     */
    parseRecipeInput(inputString) {
        try {
            // 移除外层的方括号并分割
            let cleaned = inputString.trim();
            
            if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                cleaned = cleaned.slice(1, -1);
            }

            // 检查是否是嵌套数组（有序配方）
            if (cleaned.includes('[[') || cleaned.includes('], [')) {
                return this.parseShapedInput(cleaned);
            } else {
                // 无序配方，简单数组
                return this.parseShapelessInput(cleaned);
            }
        } catch (error) {
            console.warn('解析输入失败:', inputString, error.message);
            return [];
        }
    }

    /**
     * 解析有序配方输入（3x3网格）
     */
    parseShapedInput(inputString) {
        const rows = [];
        let currentRow = '';
        let bracketCount = 0;
        let inQuotes = false;

        for (let i = 0; i < inputString.length; i++) {
            const char = inputString[i];
            
            if (char === '"') inQuotes = !inQuotes;
            if (!inQuotes) {
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
            }

            currentRow += char;

            // 当找到完整的行时
            if (bracketCount === 0 && currentRow.trim().endsWith(']')) {
                const rowString = currentRow.trim();
                if (rowString.startsWith('[') && rowString.endsWith(']')) {
                    const items = this.parseRowItems(rowString.slice(1, -1));
                    rows.push(items);
                }
                currentRow = '';
                // 跳过可能的逗号和空格
                while (i + 1 < inputString.length && 
                       (inputString[i + 1] === ',' || inputString[i + 1] === ' ')) {
                    i++;
                }
            }
        }

        return rows;
    }

    /**
     * 解析无序配方输入
     */
    parseShapelessInput(inputString) {
        return this.parseRowItems(inputString);
    }

    /**
     * 解析一行中的物品
     */
    parseRowItems(rowString) {
        const items = [];
        const parts = this.splitIgnoringQuotes(rowString, ',');

        for (let part of parts) {
            part = part.trim();
            if (part) {
                const item = this.parseItem(part);
                items.push(item);
            }
        }

        return items;
    }

    /**
     * 按逗号分割，但忽略引号内的逗号
     */
    splitIgnoringQuotes(str, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let bracketCount = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            
            if (char === '"') inQuotes = !inQuotes;
            if (!inQuotes) {
                if (char === '<') bracketCount++;
                if (char === '>') bracketCount--;
            }

            if (char === delimiter && !inQuotes && bracketCount === 0) {
                if (current.trim()) result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) result.push(current.trim());
        return result;
    }

    /**
     * 解析单行配方
     */
    parseRecipeLine(line) {
        // 跳过非配方行
        if (!line.includes('recipes.add')) {
            return null;
        }

        try {
            // 匹配有序配方
            const shapedMatch = line.match(/recipes\.addShaped\s*\(\s*"([^"]+)"\s*,\s*(.+?)\s*,\s*(\[.+\])\s*\);?$/);
            if (shapedMatch) {
                const [, recipeName, output, inputArray] = shapedMatch;
                
                return {
                    type: 'shaped',
                    name: recipeName,
                    output: this.parseItem(output),
                    input: this.parseRecipeInput(inputArray),
                    rawLine: line.trim()
                };
            }

            // 匹配无序配方
            const shapelessMatch = line.match(/recipes\.addShapeless\s*\(\s*"([^"]+)"\s*,\s*(.+?)\s*,\s*(\[.+?\])\s*\);?$/);
            if (shapelessMatch) {
                const [, recipeName, output, inputArray] = shapelessMatch;
                
                return {
                    type: 'shapeless',
                    name: recipeName,
                    output: this.parseItem(output),
                    input: this.parseRecipeInput(inputArray),
                    rawLine: line.trim()
                };
            }

        } catch (error) {
            console.warn('解析配方行失败:', line, error.message);
            this.stats.invalid++;
            return null;
        }

        return null;
    }

    /**
     * 解析整个配方文件
     */
    parseFile(fileContent) {
        const lines = fileContent.split('\n');
        console.log(`开始解析 ${lines.length} 行配方数据...`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line && line.includes('recipes.add')) {
                const recipe = this.parseRecipeLine(line);
                if (recipe) {
                    this.recipes.push(recipe);
                    
                    if (recipe.type === 'shaped') {
                        this.stats.shaped++;
                    } else if (recipe.type === 'shapeless') {
                        this.stats.shapeless++;
                    }
                    
                    this.stats.total++;
                    
                    // 每1000个配方输出进度
                    if (this.stats.total % 1000 === 0) {
                        console.log(`已解析 ${this.stats.total} 个配方...`);
                    }
                }
            }
        }

        console.log('解析完成！');
        console.log('统计信息:', this.stats);
        return this.recipes;
    }

    /**
     * 导出为JSON
     */
    exportToJSON() {
        return {
            metadata: {
                totalRecipes: this.stats.total,
                shapedRecipes: this.stats.shaped,
                shapelessRecipes: this.stats.shapeless,
                invalidRecipes: this.stats.invalid,
                exportTime: new Date().toISOString()
            },
            recipes: this.recipes
        };
    }

    /**
     * 按mod分组导出
     */
    exportByMod() {
        const byMod = {};
        
        for (const recipe of this.recipes) {
            if (recipe.output && recipe.output.modid) {
                const modid = recipe.output.modid;
                if (!byMod[modid]) {
                    byMod[modid] = [];
                }
                byMod[modid].push(recipe);
            }
        }

        return {
            metadata: {
                totalMods: Object.keys(byMod).length,
                totalRecipes: this.stats.total,
                exportTime: new Date().toISOString()
            },
            recipesByMod: byMod
        };
    }

    /**
     * 搜索配方
     */
    searchRecipes(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const recipe of this.recipes) {
            // 搜索配方名称
            if (recipe.name.toLowerCase().includes(lowerQuery)) {
                results.push(recipe);
                continue;
            }

            // 搜索输出物品
            if (recipe.output && recipe.output.fullName && 
                recipe.output.fullName.toLowerCase().includes(lowerQuery)) {
                results.push(recipe);
                continue;
            }

            // 搜索输入物品
            const inputStr = JSON.stringify(recipe.input).toLowerCase();
            if (inputStr.includes(lowerQuery)) {
                results.push(recipe);
            }
        }

        return results;
    }
}

// 如果在Node.js环境中运行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecipeParser;
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
    window.RecipeParser = RecipeParser;
}

// 使用示例
if (typeof require !== 'undefined') {
    const fs = require('fs');
    
    // 使用示例函数
    function parseRecipeFile(filePath, outputPath = null) {
        try {
            console.log('读取配方文件...');
            const fileContent = fs.readFileSync(filePath, 'utf8');
            
            console.log('初始化解析器...');
            const parser = new RecipeParser();
            
            console.log('开始解析...');
            parser.parseFile(fileContent);
            
            const jsonData = parser.exportToJSON();
            
            if (outputPath) {
                fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
                console.log(`配方已导出到: ${outputPath}`);
            }
            
            return jsonData;
            
        } catch (error) {
            console.error('处理文件时出错:', error.message);
            throw error;
        }
    }

    // 如果直接运行此脚本
    if (require.main === module) {
        const inputFile = process.argv[2] || 'recipes.log';
        const outputFile = process.argv[3] || 'recipes.json';
        
        console.log(`输入文件: ${inputFile}`);
        console.log(`输出文件: ${outputFile}`);
        
        parseRecipeFile(inputFile, outputFile);
    }
}
