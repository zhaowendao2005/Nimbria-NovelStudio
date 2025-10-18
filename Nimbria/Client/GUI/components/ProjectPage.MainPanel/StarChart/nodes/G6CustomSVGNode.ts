/**
 * G6 自定义 SVG 节点
 * 复用 Cytoscape 的 SVG DataURL 生成逻辑
 */
import { Graph } from '@antv/g6'
import { getSVGIcon, getRandomSVGIcon, generateNodeSVGDataURL } from '@stores/projectPage/starChart/node.svg.library'

/**
 * 注册 G6 自定义 SVG 节点
 * 使用 Image 形状渲染 SVG DataURL
 */
export function registerG6CustomSVGNode() {
  Graph.registerNode(
    'custom-svg-node',
    {
      draw(cfg: any, group: any) {
        const { size = 30, style = {} } = cfg
        const {
          stroke = '#999',
          lineWidth = 2,
          fill = '#999',
        } = style
        
        // 获取 SVG 图标
        const svgIcon = cfg.data?.svgIcon || getRandomSVGIcon()
        
        // 生成 SVG DataURL（复用 Cytoscape 逻辑）
        const svgDataURL = generateNodeSVGDataURL(
          svgIcon,
          stroke,
          0.8,  // stroke opacity
          fill,
          0.05  // fill opacity (空心效果)
        )
        
        // 添加图片形状
        const image = group.addShape('image', {
          attrs: {
            x: -size / 2,
            y: -size / 2,
            width: size,
            height: size,
            img: svgDataURL,
          },
          name: 'node-image',
          draggable: true,
        })
        
        // 添加边框圆形（用于高亮效果）
        group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r: size / 2,
            stroke: stroke,
            lineWidth: lineWidth,
            fill: 'transparent',
          },
          name: 'node-border',
          draggable: true,
        })
        
        // 添加文字标签（节点名称）
        if (cfg.data?.name) {
          group.addShape('text', {
            attrs: {
              text: cfg.data.name,
              x: 0,
              y: size / 2 + 15,
              fontSize: 12,
              fill: '#fff',
              textAlign: 'center',
              textBaseline: 'top',
            },
            name: 'node-label',
          })
        }
        
        return image
      },
      
      // 更新节点（高亮等状态变化）
      update(cfg: any, item: any) {
        const group = item.getContainer()
        const border = group.find((e: any) => e.get('name') === 'node-border')
        
        if (border && cfg.style) {
          // 更新边框样式实现高亮
          border.attr({
            stroke: cfg.style.stroke,
            lineWidth: cfg.style.lineWidth,
          })
        }
      },
      
      // 状态样式定义
      setState(name: string, value: boolean, item: any) {
        const group = item.getContainer()
        const border = group.find((e: any) => e.get('name') === 'node-border')
        
        if (name === 'highlight') {
          // 高亮状态
          if (border) {
            border.attr({
              lineWidth: value ? 4 : 2,
              shadowBlur: value ? 10 : 0,
              shadowColor: value ? '#409EFF' : 'transparent',
            })
          }
        } else if (name === 'dimmed') {
          // 淡化状态
          group.attr('opacity', value ? 0.3 : 1)
        } else if (name === 'neighbor') {
          // 邻居节点状态
          if (border) {
            border.attr({
              lineWidth: value ? 3 : 2,
            })
          }
        }
      },
    },
    'circle' // 继承自 circle 基础节点
  )
  
  console.log('[G6CustomSVGNode] 自定义 SVG 节点已注册')
}

