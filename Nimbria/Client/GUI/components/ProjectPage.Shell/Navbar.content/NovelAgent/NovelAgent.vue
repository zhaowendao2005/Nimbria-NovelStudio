<template>
  <div class="novel-agent-container">
    <!-- Tree 组件 - 淡蓝色边框 -->
    <el-tree 
      :data="treeData" 
      node-key="id"
      :props="treeProps"
      default-expand-all
      @node-click="handleNodeClick"
      class="agent-tree"
    >
      <!-- 自定义节点渲染 -->
      <template #default="{ node, data }">
        <!-- 根节点：StarChart, 其他 -->
        <div v-if="isRootNode(data)" class="tree-node root-node">
          <span class="node-label">{{ data.label }}</span>
        </div>
        
        <!-- 分隔面板节点：包含折叠面板 -->
        <div v-else class="separator-panel-wrapper">
          <!-- 折叠面板容器 -->
          <el-collapse 
            v-model="activeCollapse"
            class="inner-collapse"
          >
            <!-- 控制台折叠项 -->
            <el-collapse-item title="控制台" name="console">
              <console-panel />
            </el-collapse-item>
            
            <!-- 配置初始化折叠项 -->
            <el-collapse-item title="视图配置（初始化）" name="config-init">
              <config-init-panel />
            </el-collapse-item>
            
            <!-- 配置即时折叠项 -->
            <el-collapse-item title="视图配置（即时）" name="config-live">
              <config-live-panel />
            </el-collapse-item>
            
            <!-- 初始化进度折叠项 -->
            <el-collapse-item title="初始化进度" name="progress">
              <progress-panel />
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConsolePanel from './ConsolePanel.vue'
import ConfigInitPanel from './ConfigInitPanel.vue'
import ConfigLivePanel from './ConfigLivePanel.vue'
import ProgressPanel from './ProgressPanel.vue'

/**
 * NovelAgent 主组件
 * 星图系统和其他功能的统一入口
 * 使用Tree结构 + 内嵌Collapse折叠面板
 */

// Tree 数据结构（简化为1个分隔面板子节点）
const treeData = ref([
  {
    id: 'starchart',
    label: 'StarChart 星图 - 世界树系统',
    type: 'root',
    children: [
      { 
        id: 'starchart-separator', 
        label: '功能面板',
        type: 'separator'
      }
    ]
  },
  {
    id: 'other',
    label: '其他',
    type: 'root',
    children: []
  }
])

// Tree props 配置
const treeProps = ref({
  children: 'children',
  label: 'label'
})

// 折叠面板活跃项
const activeCollapse = ref(['console'])

// 判断是否为根节点
const isRootNode = (data: any) => {
  return data.type === 'root'
}

// 节点点击处理
const handleNodeClick = (data: any) => {
  console.log('Node clicked:', data.id, data.type)
}
</script>

<style scoped lang="scss">
@import './NovelAgent.scss';

// 将 SCSS 变量转换为 CSS 变量，供子组件使用
.novel-agent-container {
  --card-border-color: #{$card-border-color};
  --card-title-bg-color: #{$card-title-bg-color};
  --card-content-bg-color: #{$card-content-bg-color};
}
</style>

