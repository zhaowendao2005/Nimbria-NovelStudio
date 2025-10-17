/**
 * StarChart 节点 SVG 图标库
 * 包含14个不同的SVG图标，支持动态颜色和透明度
 */

export interface SVGNodeIcon {
    id: string
    name: string
    category: 'basic' | 'geometric' | 'network' | 'structure' | 'user'
    svg: string
    description: string
  }
  
  /**
   * 生成动态SVG - 支持自定义颜色和透明度
   */
  export function generateDynamicSVG(
    template: string, 
    strokeColor: string = '#666666', 
    strokeOpacity: number = 0.8,
    fillColor: string = 'transparent',
    fillOpacity: number = 0.05
  ): string {
    return template
      .replace(/stroke="#[^"]*"/g, `stroke="${strokeColor}"`)
      .replace(/stroke-opacity="[^"]*"/g, `stroke-opacity="${strokeOpacity}"`)
      .replace(/fill="#[^"]*"/g, fillColor === 'transparent' ? 'fill="none"' : `fill="${fillColor}"`)
      .replace(/fill-opacity="[^"]*"/g, `fill-opacity="${fillOpacity}"`);
  }
  
  /**
   * 14个SVG节点图标
   */
  export const SVG_NODE_ICONS: SVGNodeIcon[] = [
    // === 基础连接类 ===
    {
      id: 'connection-points',
      name: '🔗 连接点',
      category: 'network',
      description: '四个连接点，适合表示枢纽节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12.54 7.165c.5-.162.901-.543 1.091-1.03l4.233 4.234a1.76 1.76 0 0 0-1.03 1.092z"/>
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="m16.835 12.54l-4.296 4.295c.5.162.902.543 1.092 1.03l4.233-4.234a1.76 1.76 0 0 1-1.03-1.092"/>
        <circle cx="12" cy="5.5" r="2.5" fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"/>
        <circle cx="12" cy="18.5" r="2.5" fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"/>
        <circle cx="5.5" cy="12" r="2.5" fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"/>
        <circle cx="18.5" cy="12" r="2.5" fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"/>
      </svg>`
    },
  
    {
      id: 'hexagon-outline',
      name: '⬡ 六边形',
      category: 'geometric',
      description: '经典六边形轮廓，简洁几何',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M8.5 1.443a1 1 0 0 0-1 0L2.572 4.29a1 1 0 0 0-.5.866v5.69a1 1 0 0 0 .5.866L7.5 14.557a1 1 0 0 0 1 0l4.928-2.846a1 1 0 0 0 .5-.866v-5.69a1 1 0 0 0-.5-.866z"/>
      </svg>`
    },
  
    {
      id: 'multi-hexagon',
      name: '🏠 多层立方',
      category: 'structure',
      description: '多层六边形，表示复杂结构',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 36 36">
        <path fill="none" stroke="#666666" stroke-width="1.2" stroke-opacity="0.8" 
              d="M10.5 34.29L2 29.39v-9.81l8.5-4.9l8.5 4.9v9.81ZM4 28.23L10.5 32l6.5-3.77v-7.49L10.5 17L4 20.74Z"/>
        <path fill="none" stroke="#666666" stroke-width="1.2" stroke-opacity="0.8"
              d="m25.5 34.29l-8.5-4.9v-9.81l8.5-4.9l8.5 4.9v9.81ZM19 28.23L25.5 32l6.5-3.77v-7.49L25.5 17L19 20.74Z"/>
        <path fill="none" stroke="#666666" stroke-width="1.2" stroke-opacity="0.8"
              d="m18 21.32l-8.5-4.9V6.61l8.5-4.9l8.5 4.9v9.81Zm-6.5-6.06L18 19l6.5-3.75V7.77L18 4l-6.5 3.77Z"/>
      </svg>`
    },
  
    {
      id: 'building-column',
      name: '🏛️ 建筑柱',
      category: 'structure',
      description: '建筑柱状结构，表示稳固节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 430 512">
        <path fill="none" stroke="#666666" stroke-width="12" stroke-opacity="0.8"
              d="M71.609 112.569v286.649h143.432v-215.04h71.608v215.04h71.608V112.569z"/>
        <path fill="none" stroke="#666666" stroke-width="12" stroke-opacity="0.8"
              d="M430.08 40.96v430.08H0V40.96z"/>
      </svg>`
    },
  
    {
      id: 'network-complex',
      name: '🌐 复杂网络',
      category: 'network',
      description: '复杂网络图案，表示重要枢纽',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 284">
        <path fill="none" stroke="#666666" stroke-width="3" stroke-opacity="0.8"
              d="M245.256 231.632c-3.319.287-5.878-1.911-8.513-3.917c-32.105-24.445-64.206-48.894-96.311-73.338c-2.131-1.623-4.323-3.168-6.418-4.835"/>
        <path fill="none" stroke="#666666" stroke-width="3" stroke-opacity="0.8"
              d="M60.002 141.392c-.373-3.68 1.337-6.118 4.025-8.164c12.288-9.352 24.497-18.807 36.816-28.118"/>
        <path fill="none" stroke="#666666" stroke-width="3" stroke-opacity="0.8"
              d="M180.96 283.592c-2.869.119-5.203-1.105-7.372-2.78c-33.919-26.188-67.856-52.355-101.745-78.583"/>
        <circle cx="128" cy="50" r="12" fill="none" stroke="#666666" stroke-width="2" stroke-opacity="0.8"/>
        <circle cx="50" cy="150" r="8" fill="none" stroke="#666666" stroke-width="2" stroke-opacity="0.8"/>
        <circle cx="200" cy="200" r="10" fill="none" stroke="#666666" stroke-width="2" stroke-opacity="0.8"/>
      </svg>`
    },
  
    {
      id: 'user-avatar',
      name: '👤 用户头像',
      category: 'user',
      description: '用户头像，表示人物角色',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M9.775 12q-.9 0-1.5-.675T7.8 9.75l.325-2.45q.2-1.425 1.3-2.363T12 4t2.575.938t1.3 2.362l.325 2.45q.125.9-.475 1.575t-1.5.675z"/>
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M4 18v-.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2v.8"/>
      </svg>`
    },
  
    {
      id: 'triangle-tent',
      name: '🔺 三角帐篷',
      category: 'geometric',
      description: '三角形帐篷，表示事件节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M10.239 1.633L12 4.684l1.761-3.05l1.732 1l-2.338 4.05L19.11 17H23v2h-2.735l1.128 1.954l-1.732 1L17.956 19H6.044"/>
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12 8.684L7.199 17H16.8z"/>
      </svg>`
    },
  
    // === 额外的7个变体 ===
    {
      id: 'circle-simple',
      name: '⭕ 简单圆形',
      category: 'basic',
      description: '简洁圆形，通用节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"/>
      </svg>`
    },
  
    {
      id: 'square-outline',
      name: '⬜ 方形轮廓',
      category: 'geometric',
      description: '方形轮廓，基础几何',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"/>
      </svg>`
    },
  
    {
      id: 'diamond-outline',
      name: '💎 菱形轮廓',
      category: 'geometric',
      description: '菱形轮廓，特殊形状',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12 2l6 6-6 6-6-6z"/>
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12 10l6 6-6 6-6-6z"/>
      </svg>`
    },
  
    {
      id: 'star-outline',
      name: '⭐ 五角星',
      category: 'geometric',
      description: '五角星轮廓，重要标识',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`
    },
  
    {
      id: 'cross-plus',
      name: '➕ 十字加号',
      category: 'basic',
      description: '十字加号，连接节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="2" stroke-opacity="0.8"
              d="M12 6v12M6 12h12"/>
      </svg>`
    },
  
    {
      id: 'hexagon-double',
      name: '⬢ 双层六边形',
      category: 'geometric',
      description: '双层六边形，强化节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12 2l4 2.5v7L12 14l-4-2.5v-7z"/>
        <path fill="none" stroke="#666666" stroke-width="1" stroke-opacity="0.6"
              d="M12 4l2.5 1.5v5L12 12l-2.5-1.5v-5z"/>
      </svg>`
    },
  
    {
      id: 'gear-outline',
      name: '⚙️ 齿轮轮廓',
      category: 'structure',
      description: '齿轮轮廓，机制节点',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        <path fill="none" stroke="#666666" stroke-width="1.5" stroke-opacity="0.8"
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>`
    }
  ]
  
  /**
   * 根据索引获取SVG图标
   */
  export function getSVGIcon(index: number): SVGNodeIcon {
    if (index < 0 || index >= SVG_NODE_ICONS.length) {
      return SVG_NODE_ICONS[0] // 默认返回第一个
    }
    return SVG_NODE_ICONS[index]
  }
  
  /**
   * 随机选择SVG图标
   */
  export function getRandomSVGIcon(): SVGNodeIcon {
    const randomIndex = Math.floor(Math.random() * SVG_NODE_ICONS.length)
    return SVG_NODE_ICONS[randomIndex]
  }
  
  /**
   * 按类别筛选SVG图标
   */
  export function getSVGIconsByCategory(category: SVGNodeIcon['category']): SVGNodeIcon[] {
    return SVG_NODE_ICONS.filter(icon => icon.category === category)
  }
  
  /**
   * 生成节点背景SVG Data URL
   */
  export function generateNodeSVGDataURL(
    icon: SVGNodeIcon,
    strokeColor: string = '#666666',
    strokeOpacity: number = 0.8,
    fillColor: string = 'transparent',
    fillOpacity: number = 0.05
  ): string {
    const dynamicSVG = generateDynamicSVG(icon.svg, strokeColor, strokeOpacity, fillColor, fillOpacity)
    return `data:image/svg+xml;utf8,${encodeURIComponent(dynamicSVG)}`
  }