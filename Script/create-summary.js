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

// 格式化日期为 YYYY-MM-DD-HH-MM
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}-${minute}`;
}

// 获取下一个序号
function getNextSequence(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    let maxSeq = 0;
    
    files.forEach(file => {
      const match = file.match(/^(\d+)-/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    
    return maxSeq + 1;
  } catch (err) {
    console.error('读取目录失败:', err.message);
    return 1;
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
  const nextSeq = getNextSequence(summaryDir);
  const seqStr = String(nextSeq).padStart(2, '0');
  
  // 创建交互式输入
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('请输入总结文件标题 (或按Enter使用默认标题): ', (title) => {
    const finalTitle = title.trim() || '新总结';
    const fileName = `${seqStr}-${dateStr}-${finalTitle}.md`;
    const filePath = path.join(summaryDir, fileName);
    
    try {
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        console.error(`错误：文件已存在: ${fileName}`);
        rl.close();
        process.exit(1);
      }
      
      // 创建空文件
      fs.writeFileSync(filePath, '', 'utf8');
      console.log(`✅ 成功创建文件: ${fileName}`);
      console.log(`📁 路径: ${filePath}`);
      console.log(`⏰ 时间: ${bjTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    } catch (err) {
      console.error('创建文件失败:', err.message);
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
