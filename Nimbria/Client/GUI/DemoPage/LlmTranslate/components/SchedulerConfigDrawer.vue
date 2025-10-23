<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="(val: boolean) => $emit('update:visible', val)"
    title="调度器配置"
    direction="rtl"
    size="500px"
    :before-close="handleClose"
  >
    <div class="scheduler-config-drawer">
      <el-tabs v-model="activeTab">
        <!-- Tab 0: 模型配置 -->
        <el-tab-pane label="模型配置" name="model-config">
          <div class="config-section">
            <!-- 模型选择器 -->
            <div class="config-item">
              <div class="config-label">
                <span>选择模型</span>
                <el-tooltip content="选择用于翻译的LLM模型，将应用于当前批次的所有新任务" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <ModelSelector
                v-model="modelConfigForm.modelId"
                @update:model-value="handleModelChange"
              />
            </div>

            <!-- 系统提示词模板选择 -->
            <div class="config-item">
              <div class="config-label">
                <span>系统提示词模板</span>
                <el-tooltip content="选择预设模板或创建自定义模板" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div style="display: flex; gap: 8px">
                <el-select
                  v-model="selectedPromptTemplateId"
                  placeholder="选择模板"
                  clearable
                  style="flex: 1"
                  @change="handlePromptTemplateChange"
                >
                  <el-option-group
                    v-for="category in promptTemplateCategories"
                    :key="category"
                    :label="category"
                  >
                    <el-option
                      v-for="template in getTemplatesByCategory(category)"
                      :key="template.id"
                      :label="template.name"
                      :value="template.id"
                    >
                      <span>{{ template.name }}</span>
                      <el-tag
                        v-if="template.isBuiltin"
                size="small"
                        type="info"
                        style="margin-left: 8px"
                      >
                        内置
                      </el-tag>
                    </el-option>
                  </el-option-group>
                </el-select>
                <el-button @click="showPromptTemplateDialog('create')">
                  <el-icon><Plus /></el-icon>
                  新建
                </el-button>
                <el-button
                  v-if="selectedPromptTemplateId"
                  @click="showPromptTemplateDialog('edit')"
                >
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button
                  v-if="selectedPromptTemplateId && canDeleteCurrentTemplate"
                  type="danger"
                  @click="handleDeletePromptTemplate"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </div>

            <!-- 系统提示词内容预览/编辑 -->
            <div class="config-item">
              <div class="config-label">
                <span>提示词内容</span>
                <el-tooltip content="当前使用的系统提示词内容，可直接编辑" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input
                v-model="modelConfigForm.systemPrompt"
                type="textarea"
                :rows="8"
                placeholder="你是一个专业的翻译助手..."
              />
              <div v-if="selectedPromptTemplateId" style="margin-top: 8px; font-size: 12px; color: #909399">
                <el-icon><InfoFilled /></el-icon>
                当前已选择模板：{{ currentTemplateName }}
              </div>
            </div>

            <el-alert
              title="配置说明"
              type="warning"
              :closable="false"
              class="config-alert"
            >
              <div>• 修改模型配置后会立即更新批次配置并保存到数据库</div>
              <div>• 新发送的任务将使用新的模型配置</div>
              <div>• 已发送或正在执行的任务仍使用原配置</div>
            </el-alert>
          </div>
        </el-tab-pane>

        <!-- Tab 1: 基础设置 -->
        <el-tab-pane label="基础设置" name="basic">
          <div class="config-section">
            <!-- 最高并发数 -->
            <div class="config-item">
              <div class="config-label">
                <span>最高并发数</span>
                <el-tooltip content="同时执行的任务数量，建议1-5" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-slider
                v-model="form.maxConcurrency"
                :min="1"
                :max="10"
                :step="1"
                show-input
                :input-size="'small'"
              />
            </div>

          </div>
        </el-tab-pane>

        <!-- Tab 2: 限流处理 -->
        <el-tab-pane label="限流处理" name="throttle">
          <div class="config-section">
            <!-- 限流探针间隔 -->
            <div class="config-item">
              <div class="config-label">
                <span>限流探针间隔（秒）</span>
                <el-tooltip content="遇到限流后，每隔此时间发送测试请求" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="form.throttleProbeIntervalSeconds"
                :min="5"
                :max="30"
                :step="5"
                size="small"
              />
            </div>

            <!-- 探针类型 -->
            <div class="config-item">
              <div class="config-label">
                <span>探针类型</span>
                <el-tooltip content="快速检查消耗资源少但可能不准确" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-radio-group v-model="form.throttleProbeType" size="small">
                <el-radio value="quick">快速检查</el-radio>
                <el-radio value="api">API调用</el-radio>
              </el-radio-group>
            </div>

          </div>
        </el-tab-pane>

        <!-- Tab 3: 高级参数 -->
        <el-tab-pane label="高级参数" name="model-params">
          <div class="config-section">
            <el-alert
              title="层叠配置说明"
              type="info"
              :closable="false"
              class="config-alert mb-3"
            >
              <div>这些参数为<strong>可选配置</strong>，不设置则自动使用模型或提供商的默认值</div>
              <div>优先级：用户配置 > 提供商默认 > 模型默认</div>
            </el-alert>

            <!-- 最大输出Token数 -->
            <div class="config-item">
              <div class="config-label">
                <span>最大输出Token数</span>
                <el-tooltip content="限制模型生成的最大token数。不设置则使用模型默认值（通常为4096-128000）" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-input-number
                  v-model="modelParamsForm.maxTokens"
                  :min="100"
                  :max="2000000"
                  :step="1000"
                  placeholder="使用默认"
                  size="small"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.maxTokens !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.maxTokens"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.maxTokens !== undefined" class="param-value">
                当前值: {{ modelParamsForm.maxTokens }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- 温度参数 -->
            <div class="config-item">
              <div class="config-label">
                <span>温度 (Temperature)</span>
                <el-tooltip content="控制输出的随机性。0=确定性，2=极度随机。推荐翻译任务使用0.3-0.7" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.temperature !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.temperature"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.temperature !== undefined" class="param-value">
                当前值: {{ modelParamsForm.temperature }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- Top P -->
            <div class="config-item">
              <div class="config-label">
                <span>Top P</span>
                <el-tooltip content="核采样参数。0.1表示仅考虑前10%的概率分布。推荐0.9-0.95" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.topP"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.topP !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.topP"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.topP !== undefined" class="param-value">
                当前值: {{ modelParamsForm.topP }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- Frequency Penalty -->
            <div class="config-item">
              <div class="config-label">
                <span>Frequency Penalty</span>
                <el-tooltip content="降低重复词汇的概率。-2.0到2.0，正值减少重复" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.frequencyPenalty"
                  :min="-2"
                  :max="2"
                  :step="0.1"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.frequencyPenalty !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.frequencyPenalty"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.frequencyPenalty !== undefined" class="param-value">
                当前值: {{ modelParamsForm.frequencyPenalty }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>

            <!-- Presence Penalty -->
            <div class="config-item">
              <div class="config-label">
                <span>Presence Penalty</span>
                <el-tooltip content="增加话题多样性。-2.0到2.0，正值鼓励新话题" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <div class="param-control">
                <el-slider
                  v-model="modelParamsForm.presencePenalty"
                  :min="-2"
                  :max="2"
                  :step="0.1"
                  :show-input="true"
                  :show-input-controls="false"
                  class="flex-1"
                />
                <el-button 
                  v-if="modelParamsForm.presencePenalty !== undefined"
                  type="danger" 
                  size="small"
                  text
                  @click="delete modelParamsForm.presencePenalty"
                >
                  清除
                </el-button>
              </div>
              <div v-if="modelParamsForm.presencePenalty !== undefined" class="param-value">
                当前值: {{ modelParamsForm.presencePenalty }}
              </div>
              <div v-else class="param-value placeholder">
                未设置（使用默认值）
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 4: 请求控制 -->
        <el-tab-pane label="请求控制" name="request-control">
          <div class="config-section">
            <el-alert
              title="层级说明"
              type="info"
              :closable="false"
              class="config-alert mb-3"
            >
              <div><strong>📍 生效位置：</strong>这些配置控制 LangChain HTTP 客户端的底层行为</div>
              <div><strong>⚡ 作用范围：</strong>单次 API 请求的连接层和传输层超时</div>
              <div><strong>🔄 重试机制：</strong>超时后会自动重试（最多 maxRetries 次）</div>
              <div style="color: #E6A23C; margin-top: 4px;"><strong>🔗 同步说明：</strong>HTTP超时和流式空闲超时会与"超时控制"tab自动同步</div>
            </el-alert>

            <!-- 启用流式响应 -->
            <div class="config-item">
              <div class="config-label">
                <span>启用流式响应</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 400px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>控制 LangChain 调用 LLM API 的模式</div>
                      <div style="margin-top: 8px;"><strong>📡 流式模式（推荐）：</strong></div>
                      <div>• API 按 token 逐步返回，可实时显示翻译进度</div>
                      <div>• 使用"流式首字超时"和"流式空闲超时"</div>
                      <div>• 适合长文本翻译，用户体验更好</div>
                      <div style="margin-top: 8px;"><strong>📦 非流式模式：</strong></div>
                      <div>• API 翻译完成后一次性返回完整结果</div>
                      <div>• 使用"HTTP 请求超时"</div>
                      <div>• 适合短文本或不关心实时进度的场景</div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-switch
                v-model="requestControlForm.enableStreaming"
                active-text="开启"
                inactive-text="关闭"
              />
            </div>

            <!-- HTTP 请求超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>HTTP 请求超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 450px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>LangChain HTTP 客户端的底层连接超时</div>
                      <div style="margin-top: 8px;"><strong>📍 生效阶段：</strong></div>
                      <div style="margin-left: 16px;">
                        TCP连接 → 发送请求 → 【此超时控制整个过程】 → 接收响应
                      </div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div>• <strong>非流式</strong>：从发起请求到接收完整响应的总时长</div>
                      <div>• <strong>流式</strong>：仅控制 TCP 连接建立阶段</div>
                      <div style="margin-top: 8px;"><strong>🔄 重试机制：</strong></div>
                      <div>• 超时后触发自动重试（最多 maxRetries 次）</div>
                      <div style="margin-top: 8px;"><strong>💡 建议值：</strong></div>
                      <div>• 网络良好：60-120秒</div>
                      <div>• 网络不稳定：180-300秒</div>
                      <div style="margin-top: 8px; background: #FFF7E6; padding: 8px; border-radius: 4px; border-left: 3px solid #FAAD14; color: #333;">
                        <strong>🔗 同步说明：</strong>此配置与"超时控制"tab中的"HTTP超时"<strong>自动同步</strong>，修改任一处即可
                      </div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="requestControlForm.httpTimeoutSeconds"
                :min="30"
                :max="600"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ requestControlForm.httpTimeoutSeconds }}秒 ({{ (requestControlForm.httpTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- 流式空闲超时 -->
            <div v-if="requestControlForm.enableStreaming" class="config-item">
              <div class="config-label">
                <span>流式空闲超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 450px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>流式响应中，两次收到数据之间的最大允许间隔</div>
                      <div style="margin-top: 8px;"><strong>📍 生效阶段：</strong></div>
                      <div style="margin-left: 16px;">
                        收到第1个token → 【空闲超时重置】 → 收到第2个token → 【空闲超时重置】 → ...
                      </div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div>• 每次收到新的 token，计时器重置</div>
                      <div>• 如果超过设定时间没有新 token，判定为超时</div>
                      <div>• 适用于：首个token之后的所有后续token</div>
                      <div style="margin-top: 8px;"><strong>💡 使用建议：</strong></div>
                      <div>• 快速模型（GPT-4o-mini）：30-60秒</div>
                      <div>• 慢速模型或长文本：60-120秒</div>
                      <div style="margin-top: 8px;"><strong>✅ 优势：</strong>比固定HTTP超时更智能，允许AI"思考"</div>
                      <div style="margin-top: 8px; background: #FFF7E6; padding: 8px; border-radius: 4px; border-left: 3px solid #FAAD14; color: #333;">
                        <strong>🔗 同步说明：</strong>此配置与"超时控制"tab中的"流式空闲超时"<strong>自动同步</strong>，修改任一处即可
                      </div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="requestControlForm.streamIdleTimeoutSeconds"
                :min="30"
                :max="300"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ requestControlForm.streamIdleTimeoutSeconds }}秒 ({{ (requestControlForm.streamIdleTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- 最大重试次数 -->
            <div class="config-item">
              <div class="config-label">
                <span>最大重试次数</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 400px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>LangChain 自动重试机制的最大次数</div>
                      <div style="margin-top: 8px;"><strong>🔄 触发条件（会自动重试）：</strong></div>
                      <div>• HTTP 请求超时</div>
                      <div>• 流式空闲超时</div>
                      <div>• 429 限流错误（Rate Limit）</div>
                      <div>• 502/503 服务器临时错误</div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div>第1次失败 → 等待1秒 → 重试1</div>
                      <div>第2次失败 → 等待2秒 → 重试2</div>
                      <div>第3次失败 → 等待4秒 → 重试3</div>
                      <div style="margin-top: 8px;"><strong>💡 建议值：</strong></div>
                      <div>• 稳定网络：1-3次</div>
                      <div>• 不稳定或易限流：3-5次</div>
                      <div>• 不重试：设为0</div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="requestControlForm.maxRetries"
                :min="0"
                :max="10"
                :step="1"
                size="small"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 5: 超时控制 -->
        <el-tab-pane label="超时控制" name="timeout">
          <div class="config-section">
            <el-alert
              title="三层超时架构说明"
              type="info"
              :closable="false"
              class="config-alert mb-3"
            >
              <div><strong>🏗️ 架构设计：</strong>三层超时保护，层层递进</div>
              <div><strong>Layer 3（任务总超时）：</strong>兜底机制，包括排队+执行+重试的<strong>全部生命周期</strong></div>
              <div><strong>Layer 2a（HTTP超时）：</strong>非流式模式，单次HTTP请求的<strong>整体超时</strong></div>
              <div><strong>Layer 2b（流式超时）：</strong>流式模式，<strong>首字</strong>和<strong>后续token</strong>的细粒度超时</div>
              <div style="color: #E6A23C; margin-top: 4px;"><strong>🔗 同步说明：</strong>HTTP超时和流式空闲超时会与"请求控制"tab自动同步</div>
            </el-alert>

            <!-- 任务总超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>任务总超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 450px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>单个翻译任务从创建到完成的<strong>整个生命周期</strong>兜底超时</div>
                      <div style="margin-top: 8px;"><strong>📍 生效位置：</strong>Executor 层（任务执行器）</div>
                      <div style="margin-top: 8px;"><strong>📅 生命周期：</strong></div>
                      <div style="margin-left: 16px; font-size: 12px;">
                        创建任务 → 排队等待 → 开始执行 → 重试1 → 重试2 → 重试3 → 完成
                        <br/>【━━━━━━━━━━━ 任务总超时控制全程 ━━━━━━━━━━━】
                      </div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div>• 使用 Promise.race 与翻译过程竞速</div>
                      <div>• 无论任务在哪个阶段，超时后立即终止</div>
                      <div>• 标记为 <code>TIMEOUT_TOTAL</code> 错误</div>
                      <div style="margin-top: 8px;"><strong>🆚 与 HTTP 超时的区别：</strong></div>
                      <div style="background: #F4F4F5; padding: 8px; border-radius: 4px; margin-top: 4px; font-size: 12px; color: #333;">
                        <div><strong>任务总超时（这里）：</strong></div>
                        <div>• 位置：Executor 层</div>
                        <div>• 范围：任务全生命周期（排队+执行+重试）</div>
                        <div>• 目的：防止任务永久卡死</div>
                        <div style="margin-top: 6px;"><strong>HTTP 超时（请求控制）：</strong></div>
                        <div>• 位置：LangChain HTTP 客户端</div>
                        <div>• 范围：单次 HTTP 请求</div>
                        <div>• 目的：快速失败并重试</div>
                      </div>
                      <div style="margin-top: 8px;"><strong>💡 建议值：</strong></div>
                      <div>• 短文本：300-600秒（5-10分钟）</div>
                      <div>• 长文本：600-1800秒（10-30分钟）</div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="timeoutForm.taskTotalTimeoutSeconds"
                :min="60"
                :max="3600"
                :step="60"
                size="small"
              />
              <div class="param-value">
                {{ timeoutForm.taskTotalTimeoutSeconds }}秒 ({{ (timeoutForm.taskTotalTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- HTTP超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>HTTP超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 450px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>非流式模式下，单次 HTTP 请求的整体超时</div>
                      <div style="margin-top: 8px;"><strong>📍 生效位置：</strong>LangChain HTTP 客户端</div>
                      <div style="margin-top: 8px;"><strong>📍 生效场景：</strong></div>
                      <div>• <strong>仅当关闭流式响应时生效</strong></div>
                      <div>• 流式模式下，此配置被"流式首字超时"和"流式空闲超时"替代</div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div style="margin-left: 16px; font-size: 12px;">
                        发起请求 → 【HTTP超时计时】 → 接收完整响应
                        <br/>如果超过设定时间未完成，立即中止连接
                      </div>
                      <div style="margin-top: 8px;"><strong>🔄 重试机制：</strong></div>
                      <div>• 超时后触发自动重试（最多 maxRetries 次）</div>
                      <div>• 标记为 <code>TIMEOUT_HTTP</code> 错误</div>
                      <div style="margin-top: 8px;"><strong>🆚 与任务总超时的关系：</strong></div>
                      <div style="background: #F4F4F5; padding: 8px; border-radius: 4px; margin-top: 4px; font-size: 12px; color: #333;">
                        任务总超时 (600秒) &gt; HTTP超时 (120秒) × 重试次数 (3次)
                        <br/><strong>示例：</strong>120秒 × 3次重试 = 360秒 &lt; 600秒任务总超时
                      </div>
                      <div style="margin-top: 8px;"><strong>💡 建议值：</strong>120秒</div>
                      <div style="margin-top: 8px; background: #FFF7E6; padding: 8px; border-radius: 4px; border-left: 3px solid #FAAD14; color: #333;">
                        <strong>🔗 同步说明：</strong>此配置与"请求控制"tab中的"HTTP请求超时"<strong>自动同步</strong>，修改任一处即可
                      </div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="timeoutForm.httpTimeoutSeconds"
                :min="30"
                :max="600"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ timeoutForm.httpTimeoutSeconds }}秒 ({{ (timeoutForm.httpTimeoutSeconds / 60).toFixed(1) }}分钟)
              </div>
            </div>

            <!-- 流式首字超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>流式首字超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 450px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>流式模式下，等待<strong>第一个 token</strong> 的最长时间</div>
                      <div style="margin-top: 8px;"><strong>📍 生效位置：</strong>Translation Client（我们的流式处理层）</div>
                      <div style="margin-top: 8px;"><strong>📍 生效场景：</strong></div>
                      <div>• <strong>仅当开启流式响应时生效</strong></div>
                      <div>• 从发起请求到收到第一个 token 的等待时间</div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div style="margin-left: 16px; font-size: 12px;">
                        发起请求 → 【首字超时计时】 → 收到第1个token → ✅ 计时器停止
                        <br/>之后切换到"流式空闲超时"
                      </div>
                      <div style="margin-top: 8px;"><strong>🔄 超时处理：</strong></div>
                      <div>• 主动调用 <code>abortController.abort()</code> 中止连接</div>
                      <div>• 标记为 <code>TIMEOUT_FIRST_TOKEN</code> 错误</div>
                      <div>• 触发自动重试</div>
                      <div style="margin-top: 8px;"><strong>🆚 与 HTTP 超时的区别：</strong></div>
                      <div style="background: #F4F4F5; padding: 8px; border-radius: 4px; margin-top: 4px; font-size: 12px; color: #333;">
                        <div><strong>首字超时（这里）：</strong>只等首个token，精准控制</div>
                        <div><strong>HTTP 超时（请求控制）：</strong>控制整个HTTP连接建立</div>
                      </div>
                      <div style="margin-top: 8px;"><strong>💡 建议值：</strong></div>
                      <div>• 快速模型：30-60秒</div>
                      <div>• 慢速模型或长prompt：60-120秒</div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="timeoutForm.streamFirstTokenTimeoutSeconds"
                :min="10"
                :max="300"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ timeoutForm.streamFirstTokenTimeoutSeconds }}秒
              </div>
            </div>

            <!-- 流式空闲超时 -->
            <div class="config-item">
              <div class="config-label">
                <span>流式空闲超时（秒）</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div style="max-width: 450px; line-height: 1.6;">
                      <div><strong>🎯 作用：</strong>流式模式下，<strong>后续 tokens</strong> 之间的最大允许间隔</div>
                      <div style="margin-top: 8px;"><strong>📍 生效位置：</strong>Translation Client（我们的流式处理层）</div>
                      <div style="margin-top: 8px;"><strong>📍 生效场景：</strong></div>
                      <div>• <strong>仅当开启流式响应且收到首个token后生效</strong></div>
                      <div>• 监控后续所有 token 之间的间隔</div>
                      <div style="margin-top: 8px;"><strong>⚙️ 工作原理：</strong></div>
                      <div style="margin-left: 16px; font-size: 12px;">
                        收到第1个token → 【空闲超时计时】 → 收到第2个token → 【重置计时器】
                        <br/>收到第2个token → 【空闲超时计时】 → 收到第3个token → 【重置计时器】
                        <br/>...依此类推，每次收到新token就重置
                      </div>
                      <div style="margin-top: 8px;"><strong>🔄 超时处理：</strong></div>
                      <div>• 主动调用 <code>abortController.abort()</code> 中止连接</div>
                      <div>• 标记为 <code>TIMEOUT_IDLE</code> 错误</div>
                      <div>• 触发自动重试</div>
                      <div style="margin-top: 8px;"><strong>💡 建议值：</strong>60秒</div>
                      <div style="margin-top: 8px; background: #FFF7E6; padding: 8px; border-radius: 4px; border-left: 3px solid #FAAD14; color: #333;">
                        <strong>🔗 同步说明：</strong>此配置与"请求控制"tab中的"流式空闲超时"<strong>自动同步</strong>，修改任一处即可
                      </div>
                    </div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="timeoutForm.streamIdleTimeoutSeconds"
                :min="10"
                :max="300"
                :step="10"
                size="small"
              />
              <div class="param-value">
                {{ timeoutForm.streamIdleTimeoutSeconds }}秒
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 6: 调度策略 -->
        <el-tab-pane label="调度策略" name="strategy">
          <div class="config-section">
            <!-- 调度策略 -->
            <div class="config-item">
              <div class="config-label">
                <span>调度策略</span>
                <el-tooltip placement="top">
                  <template #content>
                    <div><strong>event（事件驱动）：</strong>任务完成立即发送下一个</div>
                    <div>• 适用于：成熟、高并发、稳定的提供商</div>
                    <div>• 优势：响应快，效率高</div>
                    <div style="margin-top: 8px;"><strong>timed（定时调度）：</strong>固定间隔发送任务</div>
                    <div>• 适用于：低并发、不稳定的提供商</div>
                    <div>• 优势：更稳定，避免过载</div>
                  </template>
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-radio-group v-model="strategyForm.schedulingStrategy" size="small">
                <el-radio value="event">事件驱动</el-radio>
                <el-radio value="timed">定时调度</el-radio>
              </el-radio-group>
            </div>

            <!-- 定时间隔 -->
            <div v-if="strategyForm.schedulingStrategy === 'timed'" class="config-item">
              <div class="config-label">
                <span>定时间隔（秒）</span>
                <el-tooltip content="每隔多少秒发送一批任务（受并发数限制）" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-input-number
                v-model="strategyForm.timedInterval"
                :min="1"
                :max="10"
                :step="1"
                size="small"
              />
              <div class="param-value">
                每 {{ strategyForm.timedInterval }} 秒发送一批
              </div>
            </div>

            <el-alert
              title="提示"
              type="info"
              :closable="false"
              class="config-alert"
            >
              <div>调度器配置将应用于当前批次的所有任务</div>
              <div>修改后需要重新发送任务才能生效</div>
            </el-alert>
          </div>
        </el-tab-pane>

        <!-- Tab 7: Token估算 -->
        <el-tab-pane label="Token估算" name="token">
          <div class="config-section">
            <el-alert
              title="Token估算说明"
              type="info"
              :closable="false"
              class="config-alert mb-3"
            >
              <div>用于进度条预估和成本计算</div>
              <div>不同模型的tokenizer不同，需要配置相应的换算比例</div>
            </el-alert>

            <!-- 选择配置 -->
            <div class="config-item">
              <div class="config-label">
                <span>估算配置</span>
                <el-tooltip content="选择Token换算配置" placement="top">
                  <el-icon class="info-icon"><QuestionFilled /></el-icon>
                </el-tooltip>
              </div>
              <el-select v-model="tokenForm.tokenConversionConfigId" size="small" class="w-full">
                <el-option
                  v-for="config in tokenConversionConfigs"
                  :key="config.id"
                  :label="`${config.name} (中文:${config.chineseRatio} ASCII:${config.asciiRatio})`"
                  :value="config.id"
                />
              </el-select>
            </div>

            <el-divider>配置管理</el-divider>

            <!-- 配置列表 -->
            <el-table :data="customTokenConfigs" size="small" style="width: 100%">
              <el-table-column prop="name" label="名称" />
              <el-table-column prop="chineseRatio" label="中文比例" width="80" />
              <el-table-column prop="asciiRatio" label="ASCII比例" width="90" />
              <el-table-column label="操作" width="80">
                <template #default="scope">
                  <el-button
                    size="small"
                    type="danger"
                    text
                    @click="handleDeleteTokenConfig(scope.row.id)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-button
              type="primary"
              size="small"
              class="mt-3"
              @click="showTokenConfigDialog = true"
            >
              创建新配置
            </el-button>
          </div>
        </el-tab-pane>
      </el-tabs>

      <!-- Token配置对话框 -->
      <TokenConfigDialog
        v-model="showTokenConfigDialog"
        @confirm="handleCreateTokenConfig"
      />

      <!-- 系统提示词模板对话框 -->
      <PromptTemplateDialog
        v-model="showPromptTemplateDialogVisible"
        :mode="promptTemplateDialogMode"
        :template="currentTemplate"
        @confirm="handlePromptTemplateConfirm"
      />

      <!-- 底部按钮 -->
      <div class="drawer-footer">
        <el-button @click="handleReset">重置为默认</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { QuestionFilled, Plus, Edit, Delete, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ModelSelector from './ModelSelector.vue'
import TokenConfigDialog from './TokenConfigDialog.vue'
import PromptTemplateDialog from './PromptTemplateDialog.vue'
import type { SchedulerConfig } from '../types/scheduler'
import type { TranslateConfig } from '../types/config'
import { DEFAULT_SCHEDULER_CONFIG } from '../types/scheduler'
import { useLlmTranslateStore } from '../stores/translate.store'

interface Props {
  visible: boolean
  initialConfig?: SchedulerConfig
  translateConfig?: TranslateConfig
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', config: SchedulerConfig): void
  (e: 'save-model-params', params: {
    maxTokens?: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }): void
  (e: 'save-model-config', config: {
    modelId: string
    systemPrompt: string
  }): void
  (e: 'save-timeout', config: {
    taskTotalTimeout?: number
    httpTimeout?: number
    streamFirstTokenTimeout?: number
    streamIdleTimeout?: number
  }): void
  (e: 'save-strategy', config: {
    schedulingStrategy: 'timed' | 'event'
    timedInterval?: number
  }): void
  (e: 'save-token', config: {
    tokenConversionConfigId?: string
  }): void
  (e: 'save-request-control', config: {
    httpTimeout?: number
    maxRetries?: number
    enableStreaming?: boolean
    streamIdleTimeout?: number
  }): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialConfig: () => ({ ...DEFAULT_SCHEDULER_CONFIG })
})

const emit = defineEmits<Emits>()

// Store
const store = useLlmTranslateStore()

// 当前激活的Tab
const activeTab = ref<string>('model-config')

// 表单数据（调度器配置）
const form = ref<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG })

// 超时控制表单
const timeoutForm = ref<{
  taskTotalTimeoutSeconds: number
  httpTimeoutSeconds: number
  streamFirstTokenTimeoutSeconds: number
  streamIdleTimeoutSeconds: number
}>({
  taskTotalTimeoutSeconds: 600,   // 10分钟
  httpTimeoutSeconds: 120,         // 2分钟
  streamFirstTokenTimeoutSeconds: 60,  // 1分钟
  streamIdleTimeoutSeconds: 60     // 1分钟
})

// 调度策略表单
const strategyForm = ref<{
  schedulingStrategy: 'timed' | 'event'
  timedInterval: number
}>({
  schedulingStrategy: 'event',
  timedInterval: 2
})

// Token估算表单
const tokenForm = ref<{
  tokenConversionConfigId: string
}>({
  tokenConversionConfigId: 'default-balanced'
})

// Token配置对话框
const showTokenConfigDialog = ref(false)

// Token配置列表
const tokenConversionConfigs = computed(() => store.tokenConversionConfigs)

// 系统提示词模板对话框
const showPromptTemplateDialogVisible = ref(false)
const promptTemplateDialogMode = ref<'create' | 'edit'>('create')
const selectedPromptTemplateId = ref<string | null>(null)

// 系统提示词模板列表
const systemPromptTemplates = computed(() => store.systemPromptTemplates)

// 当前选中的模板
const currentTemplate = computed(() => {
  if (!selectedPromptTemplateId.value) return null
  return systemPromptTemplates.value.find(t => t.id === selectedPromptTemplateId.value) || null
})

// 当前模板名称
const currentTemplateName = computed(() => currentTemplate.value?.name || '')

// 是否可以删除当前模板（内置模板不可删除）
const canDeleteCurrentTemplate = computed(() => {
  return currentTemplate.value && !currentTemplate.value.isBuiltin
})

// 按分类分组的模板
const promptTemplateCategories = computed(() => {
  const categories = new Set<string>()
  systemPromptTemplates.value.forEach(t => {
    if (t.category) categories.add(t.category)
  })
  return Array.from(categories).sort()
})

// 根据分类获取模板
const getTemplatesByCategory = (category: string) => {
  return systemPromptTemplates.value.filter(t => t.category === category)
}

// 自定义Token配置（排除默认配置）
const customTokenConfigs = computed(() => {
  return tokenConversionConfigs.value.filter(config => 
    !config.id.startsWith('default-')
  )
})

// 模型配置表单
const modelConfigForm = ref<{
  modelId: string
  systemPrompt: string
}>({
  modelId: '',
  systemPrompt: ''  // 不设置默认值，由加载逻辑从配置中读取
})

// 模型参数表单（从 translateConfig 中提取）
interface ModelParamsForm {
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

const modelParamsForm = ref<ModelParamsForm>({})

// 请求控制表单（使用秒作为单位，方便用户输入）
const requestControlForm = ref<{
  enableStreaming: boolean
  httpTimeoutSeconds: number
  streamIdleTimeoutSeconds: number
  maxRetries: number
}>({
  enableStreaming: true,
  httpTimeoutSeconds: 120,  // 默认 2 分钟
  streamIdleTimeoutSeconds: 60,  // 默认 1 分钟
  maxRetries: 3
})

// 监听初始配置变化
watch(() => props.initialConfig, (newConfig) => {
  if (newConfig) {
    form.value = { ...newConfig }
  }
}, { immediate: true })

// 监听 translateConfig 变化（加载模型配置和参数）
watch(() => props.translateConfig, (newConfig) => {
  if (newConfig) {
    // 加载模型配置 - 使用 ?? 替代 ||，避免空字符串被替换成默认值
    modelConfigForm.value.modelId = newConfig.modelId ?? ''
    modelConfigForm.value.systemPrompt = newConfig.systemPrompt ?? ''
    
    // 加载模型参数
    const params: ModelParamsForm = {}
    if (newConfig.maxTokens !== undefined) params.maxTokens = newConfig.maxTokens
    if (newConfig.temperature !== undefined) params.temperature = newConfig.temperature
    if (newConfig.topP !== undefined) params.topP = newConfig.topP
    if (newConfig.frequencyPenalty !== undefined) params.frequencyPenalty = newConfig.frequencyPenalty
    if (newConfig.presencePenalty !== undefined) params.presencePenalty = newConfig.presencePenalty
    modelParamsForm.value = params
    
    // 加载请求控制配置（转换为秒）
    requestControlForm.value.enableStreaming = newConfig.enableStreaming ?? true
    requestControlForm.value.httpTimeoutSeconds = newConfig.httpTimeout ? Math.round(newConfig.httpTimeout / 1000) : 120
    requestControlForm.value.streamIdleTimeoutSeconds = newConfig.streamIdleTimeout ? Math.round(newConfig.streamIdleTimeout / 1000) : 60
    requestControlForm.value.maxRetries = newConfig.maxRetries ?? 3

    // 加载超时控制配置（转换为秒）
    timeoutForm.value.taskTotalTimeoutSeconds = newConfig.taskTotalTimeout ? Math.round(newConfig.taskTotalTimeout / 1000) : 600
    timeoutForm.value.httpTimeoutSeconds = newConfig.httpTimeout ? Math.round(newConfig.httpTimeout / 1000) : 120
    timeoutForm.value.streamFirstTokenTimeoutSeconds = newConfig.streamFirstTokenTimeout ? Math.round(newConfig.streamFirstTokenTimeout / 1000) : 60
    timeoutForm.value.streamIdleTimeoutSeconds = newConfig.streamIdleTimeout ? Math.round(newConfig.streamIdleTimeout / 1000) : 60

    // 加载调度策略配置
    if (newConfig.schedulerConfig) {
      strategyForm.value.schedulingStrategy = newConfig.schedulerConfig.schedulingStrategy ?? 'event'
      strategyForm.value.timedInterval = newConfig.schedulerConfig.timedInterval ?? 2
    }

    // 加载Token估算配置
    tokenForm.value.tokenConversionConfigId = newConfig.tokenConversionConfigId ?? 'default-balanced'
  }
}, { immediate: true })

// 🔄 同步 httpTimeout：请求控制 ↔ 超时控制
watch(() => requestControlForm.value.httpTimeoutSeconds, (newValue) => {
  if (timeoutForm.value.httpTimeoutSeconds !== newValue) {
    console.log(`🔄 [同步] 请求控制的HTTP超时变更 → 同步到超时控制: ${newValue}秒`)
    timeoutForm.value.httpTimeoutSeconds = newValue
  }
})

watch(() => timeoutForm.value.httpTimeoutSeconds, (newValue) => {
  if (requestControlForm.value.httpTimeoutSeconds !== newValue) {
    console.log(`🔄 [同步] 超时控制的HTTP超时变更 → 同步到请求控制: ${newValue}秒`)
    requestControlForm.value.httpTimeoutSeconds = newValue
  }
})

// 🔄 同步 streamIdleTimeout：请求控制 ↔ 超时控制
watch(() => requestControlForm.value.streamIdleTimeoutSeconds, (newValue) => {
  if (timeoutForm.value.streamIdleTimeoutSeconds !== newValue) {
    console.log(`🔄 [同步] 请求控制的流式空闲超时变更 → 同步到超时控制: ${newValue}秒`)
    timeoutForm.value.streamIdleTimeoutSeconds = newValue
  }
})

watch(() => timeoutForm.value.streamIdleTimeoutSeconds, (newValue) => {
  if (requestControlForm.value.streamIdleTimeoutSeconds !== newValue) {
    console.log(`🔄 [同步] 超时控制的流式空闲超时变更 → 同步到请求控制: ${newValue}秒`)
    requestControlForm.value.streamIdleTimeoutSeconds = newValue
  }
})

// 监听visible变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.initialConfig) {
      form.value = { ...props.initialConfig }
    }
    if (props.translateConfig) {
      // 加载模型配置 - 使用 ?? 替代 ||，避免空字符串被替换成默认值
      modelConfigForm.value.modelId = props.translateConfig.modelId ?? ''
      modelConfigForm.value.systemPrompt = props.translateConfig.systemPrompt ?? ''
      
      // 加载模型参数
      const params: ModelParamsForm = {}
      if (props.translateConfig.maxTokens !== undefined) params.maxTokens = props.translateConfig.maxTokens
      if (props.translateConfig.temperature !== undefined) params.temperature = props.translateConfig.temperature
      if (props.translateConfig.topP !== undefined) params.topP = props.translateConfig.topP
      if (props.translateConfig.frequencyPenalty !== undefined) params.frequencyPenalty = props.translateConfig.frequencyPenalty
      if (props.translateConfig.presencePenalty !== undefined) params.presencePenalty = props.translateConfig.presencePenalty
      modelParamsForm.value = params
      
      // 加载请求控制配置（转换为秒）
      requestControlForm.value.enableStreaming = props.translateConfig.enableStreaming ?? true
      requestControlForm.value.httpTimeoutSeconds = props.translateConfig.httpTimeout ? Math.round(props.translateConfig.httpTimeout / 1000) : 120
      requestControlForm.value.streamIdleTimeoutSeconds = props.translateConfig.streamIdleTimeout ? Math.round(props.translateConfig.streamIdleTimeout / 1000) : 60
      requestControlForm.value.maxRetries = props.translateConfig.maxRetries ?? 3
    }
    activeTab.value = 'model-config'
  }
})

// 处理模型变更
const handleModelChange = (newModelId: string) => {
  console.log('🔄 [SchedulerConfigDrawer] 模型已切换:', newModelId)
  modelConfigForm.value.modelId = newModelId
}

// 保存配置
const handleSave = () => {
  // 验证配置
  if (!validateForm()) {
    return
  }
  
  // 保存模型配置（优先级最高）
  if (modelConfigForm.value.modelId) {
    emit('save-model-config', {
      modelId: modelConfigForm.value.modelId,
      systemPrompt: modelConfigForm.value.systemPrompt
    })
  }
  
  // 保存调度器基础配置
  emit('save', { ...form.value })
  
  // 保存模型参数
  emit('save-model-params', { ...modelParamsForm.value })
  
  // 保存超时控制配置（转换为毫秒）
  emit('save-timeout', {
    taskTotalTimeout: timeoutForm.value.taskTotalTimeoutSeconds * 1000,
    httpTimeout: timeoutForm.value.httpTimeoutSeconds * 1000,
    streamFirstTokenTimeout: timeoutForm.value.streamFirstTokenTimeoutSeconds * 1000,
    streamIdleTimeout: timeoutForm.value.streamIdleTimeoutSeconds * 1000
  })
  
  // 保存调度策略配置
  emit('save-strategy', {
    schedulingStrategy: strategyForm.value.schedulingStrategy,
    timedInterval: strategyForm.value.timedInterval
  })
  
  // 保存Token估算配置
  emit('save-token', {
    tokenConversionConfigId: tokenForm.value.tokenConversionConfigId
  })
  
  // 保存请求控制配置（转换为毫秒）
  emit('save-request-control', {
    enableStreaming: requestControlForm.value.enableStreaming,
    httpTimeout: requestControlForm.value.httpTimeoutSeconds * 1000,
    streamIdleTimeout: requestControlForm.value.streamIdleTimeoutSeconds * 1000,
    maxRetries: requestControlForm.value.maxRetries
  })
  
  emit('update:visible', false)
}

// 重置为默认配置
const handleReset = () => {
  form.value = { ...DEFAULT_SCHEDULER_CONFIG }
}

// 关闭抽屉
const handleClose = () => {
  emit('update:visible', false)
}

// 创建Token配置
const handleCreateTokenConfig = async (config: { name: string; chineseRatio: number; asciiRatio: number; description?: string }) => {
  try {
    await store.createTokenConfig(config)
    ElMessage({ message: 'Token配置已创建', type: 'success' })
  } catch (error) {
    ElMessage({ message: '创建Token配置失败', type: 'error' })
    console.error(error)
  }
}

// 删除Token配置
const handleDeleteTokenConfig = async (id: string) => {
  try {
    await store.deleteTokenConfig(id)
    ElMessage({ message: 'Token配置已删除', type: 'success' })
  } catch (error) {
    ElMessage({ message: '删除Token配置失败', type: 'error' })
    console.error(error)
  }
}

// ========== 系统提示词模板管理 ==========

// 显示系统提示词模板对话框
const showPromptTemplateDialog = (mode: 'create' | 'edit') => {
  promptTemplateDialogMode.value = mode
  showPromptTemplateDialogVisible.value = true
}

// 模板选择变化
const handlePromptTemplateChange = (templateId: string | null) => {
  if (!templateId) {
    // 清除选择
    selectedPromptTemplateId.value = null
    return
  }

  const template = systemPromptTemplates.value.find(t => t.id === templateId)
  if (template) {
    console.log('📝 [SchedulerConfigDrawer] 应用模板:', template.name)
    console.log('📝 [SchedulerConfigDrawer] 模板内容:', template.content.substring(0, 50) + '...')
    
    // 将模板内容应用到systemPrompt
    modelConfigForm.value.systemPrompt = template.content
    selectedPromptTemplateId.value = templateId
    
    console.log('📝 [SchedulerConfigDrawer] 已更新 modelConfigForm.systemPrompt')
    
    ElMessage({ message: `已应用模板：${template.name}`, type: 'success' })
  } else {
    console.warn('⚠️ [SchedulerConfigDrawer] 未找到模板:', templateId)
  }
}

// 确认创建/编辑模板
const handlePromptTemplateConfirm = async (data: { name: string; content: string; category?: string; description?: string }) => {
  try {
    if (promptTemplateDialogMode.value === 'create') {
      await store.createPromptTemplate(data)
      ElMessage({ message: '模板已创建', type: 'success' })
    } else if (promptTemplateDialogMode.value === 'edit' && selectedPromptTemplateId.value) {
      await store.updatePromptTemplate(selectedPromptTemplateId.value, data)
      ElMessage({ message: '模板已更新', type: 'success' })
    }
    showPromptTemplateDialogVisible.value = false
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '操作失败'
    ElMessage({ message: errorMessage, type: 'error' })
    console.error(error)
  }
}

// 删除系统提示词模板
const handleDeletePromptTemplate = async () => {
  if (!selectedPromptTemplateId.value || !currentTemplate.value) {
    return
  }

  if (currentTemplate.value.isBuiltin) {
    ElMessage({ message: '内置模板不可删除', type: 'warning' })
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${currentTemplate.value.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await store.deletePromptTemplate(selectedPromptTemplateId.value)
    selectedPromptTemplateId.value = null
    ElMessage({ message: '模板已删除', type: 'success' })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage({ message: '删除模板失败', type: 'error' })
      console.error(error)
    }
  }
}

// 验证表单
const validateForm = (): boolean => {
  // 验证模型ID
  if (!modelConfigForm.value.modelId) {
    ElMessage({ message: '请选择模型', type: 'error' })
    activeTab.value = 'model-config'
    return false
  }
  
  // 验证并发数
  if (form.value.maxConcurrency < 1 || form.value.maxConcurrency > 10) {
    return false
  }
  
  // 验证超时配置
  if (timeoutForm.value.taskTotalTimeoutSeconds < 60 || timeoutForm.value.taskTotalTimeoutSeconds > 3600) {
    return false
  }
  
  if (timeoutForm.value.httpTimeoutSeconds < 30 || timeoutForm.value.httpTimeoutSeconds > 600) {
    return false
  }
  
  if (timeoutForm.value.streamFirstTokenTimeoutSeconds < 10 || timeoutForm.value.streamFirstTokenTimeoutSeconds > 300) {
    return false
  }
  
  if (timeoutForm.value.streamIdleTimeoutSeconds < 10 || timeoutForm.value.streamIdleTimeoutSeconds > 300) {
    return false
  }
  
  // 验证探针间隔
  if (form.value.throttleProbeIntervalSeconds < 5 || form.value.throttleProbeIntervalSeconds > 30) {
    return false
  }
  
  return true
}
</script>

<style scoped lang="scss">
.scheduler-config-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;

  :deep(.el-tabs) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .el-tabs__content {
      flex: 1;
      overflow-y: auto;
    }
  }

  .config-section {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .config-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #333;

      .info-icon {
        color: #909399;
        cursor: help;
      }
    }
  }

  .config-alert {
    margin-top: 16px;
    
    :deep(.el-alert__description) {
      font-size: 12px;
      line-height: 1.6;
      
      div {
        margin-bottom: 4px;
      }
    }
    
    &.mb-3 {
      margin-bottom: 16px;
    }
  }

  .param-control {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .flex-1 {
      flex: 1;
    }
  }

  .param-value {
    font-size: 12px;
    color: #409eff;
    margin-top: 4px;
    
    &.placeholder {
      color: #909399;
      font-style: italic;
    }
  }

  .drawer-footer {
    border-top: 1px solid #e4e7eb;
    padding: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .mt-3 {
    margin-top: 16px;
  }

  .w-full {
    width: 100%;
  }
}
</style>

