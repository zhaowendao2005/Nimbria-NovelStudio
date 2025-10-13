<template>
  <div class="tree-schema-node" :class="{ 'is-required': node?.isRequired }">
    <!-- 节点主体内容 -->
    <div class="node-content">
      <!-- 类型图标 -->
      <el-icon
        :color="displayInfo.color"
        size="1.2rem"
        class="type-icon"
      >
        <component :is="displayInfo.icon" />
      </el-icon>

      <!-- 字段名称 - 支持内联编辑 -->
      <el-input
        v-if="isEditingName"
        v-model="editingName"
        size="small"
        class="field-name-input"
        @blur="handleNameEditComplete"
        @keyup.enter="handleNameEditComplete"
        @keyup.escape="handleNameEditCancel"
        ref="nameInputRef"
      />
      <span 
        v-else
        class="field-name"
        @dblclick="startNameEdit"
      >
        {{ node?.fieldName || 'unknown' }}
      </span>

      <!-- 必填标记 -->
      <el-tag
        v-if="node?.isRequired"
        type="warning"
        size="small"
        class="required-badge"
      >
        必填
      </el-tag>

      <!-- 类型显示 -->
      <span class="field-type">({{ displayInfo.typeText }})</span>

      <!-- 描述信息 -->
      <span v-if="displayInfo.hasDescription" class="field-description">
        - {{ node?.description }}
      </span>
      
      <!-- 🆕 解析规则标记 -->
      <el-tag
        v-if="displayInfo.hasParseRule"
        type="success"
        size="small"
        class="parse-badge"
        effect="plain"
      >
        <el-icon><Search /></el-icon>
      </el-tag>
      
      <!-- 🆕 导出配置标记 -->
      <el-tag
        v-if="displayInfo.hasExportConfig"
        type="primary"
        size="small"
        class="export-badge"
        effect="plain"
      >
        <el-icon><Upload /></el-icon>
      </el-tag>
    </div>

    <!-- 悬停操作按钮 -->
    <div class="node-actions">
      <el-button-group class="action-button-group">
        <!-- 编辑按钮 -->
        <el-button
          size="small"
          type="text"
          :icon="Edit"
          @click.stop="handleEdit"
          class="action-btn"
        />

        <!-- 添加子字段按钮 - 数组类型直接添加，对象类型选择类型 -->
        <el-dropdown
          v-if="displayInfo.canAddChild && node?.type === 'object'"
          @command="handleAddChildWithType"
          trigger="click"
          @click.stop
        >
          <el-button
            size="small"
            type="text"
            :icon="Plus"
            class="action-btn"
          />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="option in typeOptions"
                :key="option.value"
                :command="option.value"
              >
                {{ option.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 数组类型直接添加子元素 -->
        <el-button
          v-if="displayInfo.canAddChild && node?.type === 'array'"
          size="small"
          type="text"
          :icon="Plus"
          @click.stop="handleAddArrayChild"
          class="action-btn"
        />

        <!-- 切换必填状态 -->
        <el-button
          size="small"
          type="text"
          :icon="node?.isRequired ? StarFilled : Star"
          @click.stop="handleToggleRequired"
          class="action-btn"
          :class="{ 'required-active': node?.isRequired }"
        />

        <!-- 快速类型切换 -->
        <el-dropdown
          @command="handleTypeChange"
          trigger="click"
          @click.stop
        >
          <el-button
            size="small"
            type="text"
            class="action-btn"
          >
            <el-icon><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="option in typeOptions"
                :key="option.value"
                :command="option.value"
                :class="{ 'is-active': option.value === getCurrentTypeValue() }"
              >
                {{ option.label }}
                <el-icon v-if="option.value === getCurrentTypeValue()" class="check-icon">
                  <Check />
                </el-icon>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 删除按钮 -->
        <el-button
          size="small"
          type="text"
          :icon="Delete"
          @click.stop="handleDelete"
          class="action-btn delete-btn"
        />
      </el-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { 
  Edit, 
  Plus, 
  Delete, 
  Star, 
  StarFilled, 
  ArrowDown, 
  Check,
  Document,
  Search,
  Upload
} from '@element-plus/icons-vue';
import { treeConverter, schemaUtils } from '@stores/projectPage/docParser/docParser.schemaUtils';
import type { TreeNodeData } from '@stores/projectPage/docParser/docParser.schemaUtils';
import type { JsonSchemaType } from '@stores/projectPage/docParser/docParser.types';

// Props
interface Props {
  node: TreeNodeData;
  data: TreeNodeData;
}

const props = defineProps<Props>();

// Emits - 完整的事件定义
const emit = defineEmits<{
  'field-name-change': [node: TreeNodeData, newName: string];
  'field-type-change': [node: TreeNodeData, newType: JsonSchemaType];
  'field-required-toggle': [node: TreeNodeData];
  'add-child-field': [parentNode: TreeNodeData, childType: JsonSchemaType, fieldName?: string];
  'delete-field': [node: TreeNodeData];
  'edit-field': [node: TreeNodeData];
}>();

// 计算属性
const displayInfo = computed(() => {
  if (!props.node) {
    return {
      icon: Document,
      color: '#909399',
      typeText: 'unknown',
      hasDescription: false,
      canAddChild: false,
      hasConstraints: false,
      constraintText: '',
      hasParseRule: false,
      parseRuleSummary: '',
      hasExportConfig: false,
      exportConfigSummary: ''
    };
  }
  
  // 🔍 调试日志
  console.log('[TreeSchemaNode] 节点信息:', {
    fieldName: props.node.fieldName,
    'x-parse': props.node['x-parse'],
    'x-export': props.node['x-export']
  });
  
  const info = treeConverter.getNodeDisplayInfo(props.node);
  console.log('[TreeSchemaNode] displayInfo:', info);
  
  return info;
});

const typeOptions = computed(() => schemaUtils.getAvailableTypes());

// 字段名编辑状态
const isEditingName = ref(false);
const editingName = ref('');
const nameInputRef = ref();

// 方法
const getCurrentTypeValue = (): string => {
  if (!props.node) return 'string';
  
  if (props.node.type === 'array' && props.node.items && Array.isArray(props.node.items)) {
    return `array[mixed]`;
  }
  return props.node.type;
};

// 字段名编辑相关方法
const startNameEdit = () => {
  if (!props.node) return;
  
  isEditingName.value = true;
  editingName.value = props.node.fieldName;
  
  void nextTick(() => {
    nameInputRef.value?.focus();
    nameInputRef.value?.select();
  });
};

const handleNameEditComplete = () => {
  if (!props.node) return;
  
  const newName = editingName.value.trim();
  
  if (!newName) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ElMessage.warning('字段名不能为空' as any);
    return;
  }
  
  if (!schemaUtils.isValidFieldName(newName)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ElMessage.warning('字段名格式不正确，只能包含字母、数字和下划线，且不能以数字开头' as any);
    return;
  }
  
  if (newName !== props.node.fieldName) {
    emit('field-name-change', props.node, newName);
  }
  
  isEditingName.value = false;
};

const handleNameEditCancel = () => {
  isEditingName.value = false;
  editingName.value = props.node?.fieldName || '';
};

// 其他操作方法
const handleEdit = () => {
  if (props.node) {
    emit('edit-field', props.node);
  }
};

const handleAddChildWithType = (childType: JsonSchemaType) => {
  if (props.node) {
    emit('add-child-field', props.node, childType);
  }
};

const handleAddArrayChild = () => {
  if (props.node) {
    // 数组添加子元素：打开表单，由用户选择类型（默认object，仅作初值）
    emit('add-child-field', props.node, 'object');
  }
};

const handleDelete = () => {
  if (props.node) {
    emit('delete-field', props.node);
  }
};

const handleToggleRequired = () => {
  if (props.node) {
    emit('field-required-toggle', props.node);
  }
};

const handleTypeChange = (newType: JsonSchemaType) => {
  if (props.node) {
    emit('field-type-change', props.node, newType);
  }
};
</script>

<style scoped>
.tree-schema-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  padding-right: 12px; /* 🔧 为右侧操作按钮额外预留空间 */
  margin-right: 8px; /* 🔧 确保按钮与滚动条保持距离 */
  border-radius: 6px;
  transition: all 0.2s ease;
  min-height: 42px;
  width: max-content; /* 🔑 让内容决定宽度,可以超出容器 */
  min-width: 100%; /* 至少占满容器宽度 */
}

.tree-schema-node:hover {
  background: rgba(25, 118, 210, 0.05);
}

.tree-schema-node.is-required {
  border-left: 3px solid #ff9800;
}

/* 节点内容 */
.node-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.type-icon {
  flex-shrink: 0;
}

.field-name {
  font-weight: 700;
  font-size: 15px;
  color: #333;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  flex-shrink: 0;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.field-name:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.field-name-input {
  width: auto;
  min-width: 80px;
  max-width: 200px;
}

.field-name-input :deep(.el-input__inner) {
  font-weight: 700;
  font-size: 15px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  padding: 2px 8px;
  height: 26px;
  line-height: 22px;
}

.required-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.parse-badge,
.export-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.parse-badge .el-icon,
.export-badge .el-icon {
  font-size: 12px;
}

.field-type {
  color: #666;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  flex-shrink: 0;
}

.field-description {
  color: #999;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* 操作按钮 */
.node-actions {
  position: absolute;
  right: 8px;
  top: -2px;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
  background: white;
  padding: 2px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.tree-schema-node {
  position: relative; /* 为绝对定位的子元素提供参考 */
}

.tree-schema-node:hover .node-actions {
  opacity: 1;
}

.action-button-group {
  display: flex;
  align-items: center;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 0;
  transition: all 0.2s ease;
}

.action-btn:not(:last-child) {
  border-right: 1px solid var(--el-border-color-light);
}

.action-btn:hover {
  transform: scale(1.1);
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.1);
}

.required-active {
  color: #ff9800 !important;
}

.type-dropdown {
  width: 28px;
  height: 24px;
}

.check-icon {
  margin-left: 8px;
  color: var(--el-color-primary);
}

/* Element Plus Tree样式覆盖 */
:deep(.el-tree-node__content) {
  padding: 0 !important;
  height: auto !important;
}

:deep(.el-tree-node__expand-icon) {
  color: #666;
}

:deep(.el-tree-node__expand-icon:hover) {
  color: #1976d2;
}

/* 激活状态样式 */
.is-active {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tree-schema-node {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px;
  }

  .node-content {
    flex-wrap: wrap;
    gap: 6px;
  }

  .node-actions {
    opacity: 1;
    justify-content: center;
  }

  .field-description {
    white-space: normal;
    order: 10;
    flex-basis: 100%;
  }
}
</style>
