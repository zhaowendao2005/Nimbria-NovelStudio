#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * Markdown大纲提取器
 * 带UI交互界面的独立脚本，用于提取并打印markdown文件的标题大纲结构
 */

class MarkdownOutline {
    constructor() {
        this.headings = [];
    }

    /**
     * 解析markdown文件内容，提取标题
     * @param {string} content - markdown文件内容
     */
    parse(content) {
        const lines = content.split('\n');
        this.headings = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 匹配标题行 (# ## ### 等)
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const text = headingMatch[2].trim();
                
                this.headings.push({
                    level: level,
                    text: text,
                    line: i + 1
                });
            }
        }
    }

    /**
     * 将大纲结构转换为树形字符串
     * @returns {string} 树形结构的大纲
     */
    toTree() {
        if (this.headings.length === 0) {
            return '未找到任何标题';
        }

        const result = [];
        const stack = []; // 用于追踪当前的层级路径

        for (const heading of this.headings) {
            // 调整stack，保持正确的层级关系
            while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
                stack.pop();
            }

            // 计算缩进
            const indent = '  '.repeat(stack.length);
            const prefix = stack.length === 0 ? '├─' : '├─';
            
            // 格式化输出
            const levelIndicator = '#'.repeat(heading.level);
            const lineInfo = `(第${heading.line}行)`;
            result.push(`${indent}${prefix} ${levelIndicator} ${heading.text} ${lineInfo}`);

            // 将当前标题添加到stack
            stack.push(heading);
        }

        return result.join('\n');
    }

    /**
     * 生成简化的大纲列表
     * @returns {string} 简化的大纲列表
     */
    toList() {
        if (this.headings.length === 0) {
            return '未找到任何标题';
        }

        return this.headings.map(heading => {
            const indent = '  '.repeat(heading.level - 1);
            const levelIndicator = '#'.repeat(heading.level);
            return `${indent}${levelIndicator} ${heading.text} (第${heading.line}行)`;
        }).join('\n');
    }

    /**
     * 获取统计信息
     * @returns {object} 标题统计信息
     */
    getStats() {
        const stats = {
            总数: this.headings.length,
            按级别统计: {}
        };

        this.headings.forEach(heading => {
            const levelKey = `H${heading.level}`;
            stats.按级别统计[levelKey] = (stats.按级别统计[levelKey] || 0) + 1;
        });

        return stats;
    }
}

/**
 * 处理用户输入的文件路径
 * 去除双引号，规范化路径，兼容Windows和Linux
 * @param {string} input - 用户输入的路径
 * @returns {string} 处理后的路径
 */
function processFilePath(input) {
    if (!input) return '';
    
    // 去除首尾空白
    let filePath = input.trim();
    
    // 去除双引号（支持成对的双引号）
    if ((filePath.startsWith('"') && filePath.endsWith('"')) || 
        (filePath.startsWith("'") && filePath.endsWith("'"))) {
        filePath = filePath.slice(1, -1);
    }
    
    // 规范化路径分隔符（统一使用系统默认）
    filePath = path.normalize(filePath);
    
    return filePath;
}

/**
 * 验证文件路径
 * @param {string} filePath - 文件路径
 * @returns {object} {valid: boolean, message: string, normalizedPath: string}
 */
function validateFilePath(filePath) {
    const processedPath = processFilePath(filePath);
    
    if (!processedPath) {
        return { valid: false, message: '路径不能为空' };
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(processedPath)) {
        return { valid: false, message: `文件不存在: ${processedPath}` };
    }
    
    // 检查是否为文件（不是目录）
    const stats = fs.statSync(processedPath);
    if (!stats.isFile()) {
        return { valid: false, message: `路径指向的不是文件: ${processedPath}` };
    }
    
    // 检查文件扩展名
    const ext = path.extname(processedPath).toLowerCase();
    if (!['.md', '.markdown', '.mdown', '.mkd'].includes(ext)) {
        return { 
            valid: true, 
            message: `警告: 文件扩展名不是markdown格式 (${ext})，但仍将继续处理`,
            normalizedPath: processedPath
        };
    }
    
    return { valid: true, message: '文件路径有效', normalizedPath: processedPath };
}

/**
 * 创建readline接口
 */
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/**
 * 显示欢迎信息
 */
function showWelcome() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Markdown 大纲提取器');
    console.log('='.repeat(60));
    console.log('📝 支持提取markdown文件中的标题结构');
    console.log('🌍 兼容Windows和Linux路径格式');
    console.log('📁 支持包含空格的路径（请用双引号包围）');
    console.log('='.repeat(60) + '\n');
}

/**
 * 询问用户输入文件路径
 * @param {readline.Interface} rl - readline接口
 * @returns {Promise<string>} 用户输入的文件路径
 */
function askForFilePath(rl) {
    return new Promise((resolve) => {
        console.log('💡 提示: 路径包含空格时请用双引号包围，例如:');
        console.log('   Windows: "C:\\Users\\用户名\\Documents\\文档.md"');
        console.log('   Linux:   "/home/username/文档目录/文档.md"');
        console.log('');
        
        rl.question('📂 请输入markdown文件路径: ', (answer) => {
            resolve(answer);
        });
    });
}

/**
 * 询问用户选择输出格式
 * @param {readline.Interface} rl - readline接口
 * @returns {Promise<string>} 用户选择的格式
 */
function askForOutputFormat(rl) {
    return new Promise((resolve) => {
        console.log('\n📋 请选择输出格式:');
        console.log('  1. 树形结构 (推荐)');
        console.log('  2. 列表结构');
        console.log('  3. 统计信息');
        console.log('  4. 全部显示');
        console.log('');
        
        rl.question('请输入选项 (1-4): ', (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * 询问是否继续处理其他文件
 * @param {readline.Interface} rl - readline接口
 * @returns {Promise<boolean>} 是否继续
 */
function askToContinue(rl) {
    return new Promise((resolve) => {
        rl.question('\n🔄 是否要处理其他文件? (y/n): ', (answer) => {
            const normalizedAnswer = answer.toLowerCase().trim();
            resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes' || normalizedAnswer === '是');
        });
    });
}

/**
 * 处理markdown文件并显示结果
 * @param {string} filePath - 文件路径
 * @param {string} outputFormat - 输出格式选项
 */
function processMarkdownFile(filePath, outputFormat) {
    try {
        // 读取文件内容
        const content = fs.readFileSync(filePath, 'utf8');
        
        console.log('\n' + '─'.repeat(60));
        console.log(`📄 正在分析文件: ${path.resolve(filePath)}`);
        console.log(`📊 文件大小: ${(content.length / 1024).toFixed(2)} KB`);
        console.log('─'.repeat(60));

        // 创建大纲提取器并解析
        const outline = new MarkdownOutline();
        outline.parse(content);

        // 根据用户选择输出结果
        switch(outputFormat) {
            case '1':
                console.log('\n🌳 大纲树形结构:');
                console.log(outline.toTree());
                break;
            case '2':
                console.log('\n📋 大纲列表:');
                console.log(outline.toList());
                break;
            case '3': {
                const stats = outline.getStats();
                console.log('\n📊 标题统计信息:');
                console.log(`总标题数: ${stats.总数}`);
                console.log('各级别统计:');
                Object.entries(stats.按级别统计).forEach(([level, count]) => {
                    console.log(`  ${level}: ${count}个`);
                });
                break;
            }
            case '4': {
                // 显示统计信息
                const allStats = outline.getStats();
                console.log('\n📊 标题统计信息:');
                console.log(`总标题数: ${allStats.总数}`);
                console.log('各级别统计:');
                Object.entries(allStats.按级别统计).forEach(([level, count]) => {
                    console.log(`  ${level}: ${count}个`);
                });
                
                // 显示列表结构
                console.log('\n📋 大纲列表:');
                console.log(outline.toList());
                
                // 显示树形结构
                console.log('\n🌳 大纲树形结构:');
                console.log(outline.toTree());
                break;
            }
            default:
                console.log('\n⚠️  无效的选项，显示默认树形结构:');
                console.log(outline.toTree());
                break;
        }

        console.log('\n✅ 分析完成!');

    } catch (error) {
        console.error(`❌ 错误: 读取或处理文件失败`);
        console.error(`详细信息: ${error.message}`);
    }
}

/**
 * 主函数 - 交互式界面
 */
async function main() {
    const rl = createInterface();
    
    try {
        showWelcome();
        
        let continueProcessing = true;
        
        while (continueProcessing) {
            // 询问文件路径
            const inputPath = await askForFilePath(rl);
            
            // 验证文件路径
            const validation = validateFilePath(inputPath);
            
            if (!validation.valid) {
                console.log(`❌ ${validation.message}`);
                console.log('请重新输入正确的文件路径。\n');
                continue;
            }
            
            if (validation.message.includes('警告')) {
                console.log(`⚠️  ${validation.message}`);
            }
            
            // 询问输出格式
            const outputFormat = await askForOutputFormat(rl);
            
            // 处理文件
            processMarkdownFile(validation.normalizedPath, outputFormat);
            
            // 询问是否继续
            continueProcessing = await askToContinue(rl);
        }
        
        console.log('\n👋 感谢使用 Markdown 大纲提取器！');
        
    } catch (error) {
        console.error('❌ 程序执行出错:', error.message);
    } finally {
        rl.close();
    }
}

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
});

// 处理Ctrl+C中断
process.on('SIGINT', () => {
    console.log('\n\n👋 用户中断，程序退出。');
    process.exit(0);
});

// 启动主程序
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    main().catch(error => {
        console.error('❌ 程序执行出错:', error.message);
        process.exit(1);
    });
}