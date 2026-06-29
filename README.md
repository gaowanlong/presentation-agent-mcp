# Presentation Agent MCP

一个基于 TypeScript 的 Presentation MCP Server —— 通过结构化 Deck JSON 和 Layout Engine 自动生成技术汇报 PPTX。

## What it does

通过 MCP tools 提供以下能力：

- **create_deck**: 根据主题自动生成结构化 Deck JSON（6-10 页）
- **get_deck**: 读取已生成的 Deck JSON
- **review_deck**: 审查 PPT 内容结构（标题过长、bullet 过多、缺页等）
- **update_slide**: 对单页进行增量修改
- **export_pptx**: 导出真实 `.pptx` 文件
- **create_storyline**: 生成故事线
- **create_style_profile**: 获取风格配置

## Architecture

```
Client (Codex/ChatGPT/Claude)
        │ MCP
        ▼
Presentation MCP Server (stdio)
        │
        ▼
Presentation Runtime
    ├── Storyline Planner      → 生成故事线
    ├── Deck Generator          → 生成结构化 Deck JSON
    ├── Layout Engine           → 布局计算
    ├── Review Engine           → 内容审查
    ├── Incremental Editor      → 单页修改
    └── PptxExporter            → PPTX 导出
```

**核心约束**：所有内容必须先进入 Deck JSON，所有布局必须经过 Layout Engine，LLM 不允许直接写 PPTX。

## Install

```bash
cd presentation-agent-mcp
npm install
```

## Run locally

```bash
# Start the MCP server (stdio mode)
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Test

```bash
npm test
```

### Test coverage

- **Schema tests**: Deck/Slide schema validation
- **Layout tests**: All 6 slide types render valid elements within bounds
- **Review tests**: 10+ static check rules
- **Export tests**: PPTX buffer generation with real PptxGenJS

## MCP tools

| Tool | Description | Input |
|------|-------------|-------|
| `create_style_profile` | Get style profile | `style_id` (default/allen_huawei_tech) |
| `create_storyline` | Generate storyline | `topic`, `audience?`, `purpose?`, `research_brief?`, `slide_count?` |
| `create_deck` | Create deck JSON | `topic`, `audience?`, `purpose?`, `research_brief?`, `slide_count?`, `style_id?` |
| `get_deck` | Read deck JSON | `deck_id` |
| `review_deck` | Review deck structure | `deck_id` |
| `update_slide` | Update a single slide | `deck_id`, `slide_id`, `instruction` |
| `export_pptx` | Export to PPTX | `deck_id` |

## Example workflow

### Full closed loop

```
1. create_deck
2. review_deck
3. export_pptx
4. update_slide
5. export_pptx again
```

### Via MCP Inspector

```bash
npx @modelcontextprotocol/inspector node --loader tsx src/index.ts
```

### Example create_deck input

```json
{
  "topic": "Agentic AI 时代端侧 OS 架构演进",
  "audience": "操作系统架构师和技术管理层",
  "purpose": "说明端侧负载变化，并提出 AgentOS Kernel 架构演进方向",
  "slide_count": 8,
  "style_id": "allen_huawei_tech"
}
```

## Built-in styles

1. **default**: Clean default presentation style
2. **allen_huawei_tech**: 面向技术战略、架构演进的技术汇报风格
   - 16:9 宽屏（13.333 x 7.5 inch）
   - 主色调: #A80000
   - 字体: Arial
   - 支持 title/agenda/insight/comparison/architecture/summary

## Slide types

- **title**: 封面页
- **agenda**: 议程页（最多 6 项）
- **insight**: 洞察页（关键观点 + 证据卡片）
- **comparison**: 对比页（左右两栏）
- **architecture**: 架构页（分层架构图）
- **summary**: 总结页（3 Takeaways + 下一步行动）

## Current limitations (V0.1)

1. **No real LLM**: 使用确定性规则生成内容，不接外部 LLM
2. **No Deep Research**: V0.1 不包含联网研究能力
3. **No UI**: 纯 MCP Server，无 Web 界面
4. **Basic layouts**: 固定坐标布局，非 constraint-based
5. **No image support**: V0.1 不包含图片搜索和渲染
6. **No PDF export**
7. **Local storage only**: 使用本地 filesystem 存储
8. **No complex animations**

## Roadmap

### V0.2
- 接入真实 LLM
- Deck Patch 机制
- 更强的 slide-level incremental editing
- 增加 roadmap、timeline、case_study 页面类型
- Remote MCP 部署

### V0.3
- 接入 Deep Research
- 企业知识库集成
- Web Console + PPT 预览
- 图标库和 SVG 架构图生成

### V1.0
- ChatGPT App 化
- 多用户 / 权限 / 模板市场
- OpenDesk Presentation Agent 集成

## Development

```bash
npm run typecheck  # TypeScript type check
npm test           # Run tests
npm run dev        # Start with tsx watch
```
