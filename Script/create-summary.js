const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 获取东八区时间 (UTC+8)
function getBeijingTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const bjTime = new Date(utc + 8 * 3600000);
  return bjTime;
}

// 格式化日期为 YYYY-MM-DD-HH-MM-SS
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}-${minute}-${second}`;
}

// 获取所有已有文件的序号和其详细信息
function getExistingFiles(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    const fileList = [];
    
    files.forEach(file => {
      const match = file.match(/^(\d+)-(.+)$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        fileList.push({
          oldSeq: seq,
          oldName: file,
          newSeq: seq + 1,
          filePath: path.join(dirPath, file)
        });
      }
    });
    
    // 按序号排序
    fileList.sort((a, b) => a.oldSeq - b.oldSeq);
    return fileList;
  } catch (err) {
    console.error('读取目录失败:', err.message);
    return [];
  }
}

// 递增所有文件的序号
async function incrementAllSequences(fileList, dirPath) {
  // 先按降序处理，避免文件名冲突
  const sortedFiles = fileList.sort((a, b) => b.oldSeq - a.oldSeq);
  
  for (const file of sortedFiles) {
    const newName = file.oldName.replace(/^\d+/, String(file.newSeq).padStart(2, '0'));
    const newPath = path.join(dirPath, newName);
    
    try {
      fs.renameSync(file.filePath, newPath);
      console.log(`  ✓ ${file.oldName} → ${newName}`);
    } catch (err) {
      console.error(`  ✗ 重命名失败 ${file.oldName}:`, err.message);
      throw err;
    }
  }
}

// 主函数
async function main() {
  const summaryDir = path.join(__dirname, '../Document/总结');
  
  // 检查目录是否存在
  if (!fs.existsSync(summaryDir)) {
    console.error('错误：总结目录不存在:', summaryDir);
    process.exit(1);
  }
  
  const bjTime = getBeijingTime();
  const dateStr = formatDate(bjTime);
  
  // 创建交互式输入
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('请输入总结文件标题 (或按Enter使用默认标题): ', async (title) => {
    const finalTitle = title.trim() || '新总结';
    const newFileName = `01-${dateStr}-${finalTitle}.md`;
    const newFilePath = path.join(summaryDir, newFileName);
    
    try {
      // 检查文件是否已存在
      if (fs.existsSync(newFilePath)) {
        console.error(`错误：文件已存在: ${newFileName}`);
        rl.close();
        process.exit(1);
      }
      
      console.log('\n📋 正在更新现有文件序号...');
      
      // 获取所有现有文件并递增序号
      const existingFiles = getExistingFiles(summaryDir);
      
      if (existingFiles.length > 0) {
        await incrementAllSequences(existingFiles, summaryDir);
      }
      
      console.log('\n✨ 正在创建新文件...');
      
      // 创建新文件
      fs.writeFileSync(newFilePath, '', 'utf8');
      
      console.log(`\n✅ 成功创建文件: ${newFileName}`);
      console.log(`📁 路径: ${newFilePath}`);
      console.log(`⏰ 时间: ${bjTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
      console.log(`\n总共更新了 ${existingFiles.length} 个文件的序号`);
      
    } catch (err) {
      console.error('\n❌ 操作失败:', err.message);
      rl.close();
      process.exit(1);
    }
    
    rl.close();
  });
}

main().catch(err => {
  console.error('执行出错:', err);
  process.exit(1);
});
