# 小学英语试卷生成器

基于AI大模型的智能小学英语试卷生成工具，支持多种题型、文档解析和个性化配置。

## 🌟 核心特性

### 📝 智能试卷生成
- **AI驱动**: 基于OpenAI GPT-4o、DeepSeek等大模型生成高质量试卷
- **多题型支持**: 听力题、选择题、填空题、阅读理解、写作题
- **个性化配置**: 支持年级、难度、主题、知识点自定义
- **智能评分**: 自动计算总分，支持灵活的分值配置

### 📄 文档解析功能
- **Word文档**: 
  - DOCX - mammoth.js专业解析（完全支持）
  - DOC - mammoth.js + 智能备用解析
- **PowerPoint文档**:
  - PPTX - JSZip + XML结构化解析
  - PPT - JSZip + 启发式二进制解析
- **智能知识点提取**: 自动从文档中提取教学重点

### 🎯 用户体验
- **现代化界面**: 基于shadcn/ui的美观响应式设计
- **实时预览**: 试卷生成后即时预览和编辑
- **多格式导出**: 支持PDF打印版和JSON数据导出
- **答案解析**: 完整的答案和详细解析

## 🚀 快速开始

### 快速试用
- 国内访问：[https://englishtestgenerator.netlify.app/](https://englishtestgenerator.netlify.app/)
- 国外访问：[https://v0-english-test-generator-gamma.vercel.app/](https://v0-english-test-generator-gamma.vercel.app/)

### 环境要求
- Node.js 18.0+
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/wangbigan/english-test-generator.git
cd english-test-generator
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

4. **访问应用**
打开浏览器访问 `http://localhost:3000`

## ⚙️ 配置说明

### OpenAI API 配置

首次使用需要配置AI服务：

1. 点击页面顶部的"OpenAI 配置"按钮
2. 填入以下信息：
   - **API Key**: 从[OpenAI官网](https://platform.openai.com/api-keys)或[deepseek官网](https://api-docs.deepseek.com/zh-cn/)获取
   - **Base URL**: 默认 `https://api.openai.com/v1`
   - **模型**: 推荐 `gpt-4o` 或 `deepseek-chat`

### 支持的AI模型

| 模型 | 提供商 | 推荐用途 |
|------|--------|----------|
| gpt-4o | OpenAI | 最佳试卷生成效果 |
| gpt-4o-mini | OpenAI | 快速生成，成本较低 |
| deepseek-chat | DeepSeek | 中文优化，性价比高 |
| deepseek-reasoner | DeepSeek | 复杂推理题目 |

## 📚 使用指南

### 1. 基本试卷生成

#### 配置试卷参数
- **年级**: 一年级到六年级
- **难度**: 低难度、中等难度、高难度
- **主题**: 如"动物"、"家庭"、"学校生活"等
- **知识点**: 描述重点考核内容

#### 题型配置
按出题顺序配置各题型：
1. **听力题** - 第一部分，包含听力材料
2. **选择题** - 4个选项，自动生成干扰项
3. **填空题** - 语法和词汇填空
4. **阅读理解** - 短文理解题
5. **写作题** - 最后部分，创作性题目

### 2. 文档知识点提取

#### 支持的文件格式
- **Word文档**: `.docx`, `.doc`
- **PowerPoint**: `.pptx`, `.ppt`
- **文本文件**: `.txt`

#### 使用步骤
1. 在"重点知识点"区域点击"上传文档"
2. 选择教学文档（最大100MB）
3. 系统自动解析并提取文本
4. 点击"提取知识点"生成教学重点
5. AI自动整理为适合出题的知识点

### 3. 试卷预览与导出

#### 预览功能
- **试卷题目**: 完整的试卷内容展示
- **答案解析**: 详细的答案和解题思路
- **实时切换**: 题目和答案页面快速切换

#### Prompt输入输出原文
- **输入**: 展示提交给大模型的Prompt原文
- **输出**: 展示大模型返回的原始内容，便于跟踪核查

#### 导出选项
- **PDF下载**: 包含试卷和答案的完整PDF文件
- **JSON导出**: 包含所有数据的结构化文件
- **Word下载**: 导出.doc格式，便于二次编辑和打印

## 🛠️ 技术架构

### 前端技术栈
- **框架**: Next.js 15 (App Router)
- **UI库**: shadcn/ui + Tailwind CSS
- **状态管理**: React Hooks
- **图标**: Lucide React

### 后端技术栈
- **运行时**: Next.js API Routes
- **AI集成**: AI SDK (Vercel)
- **文档解析**: 
  - mammoth.js (Word文档)
  - JSZip + xml2js (PowerPoint)

### 核心依赖
```json
{
  "ai": "^4.0.17",
  "@ai-sdk/openai": "^1.0.2",
  "@ai-sdk/deepseek": "^0.0.17",
  "mammoth": "^1.6.0",
  "jszip": "^3.10.1",
  "xml2js": "^0.6.2"
}
```

## 📁 项目结构

```
english-test-generator/
├── app/
│   ├── actions/                       # 服务器操作
│   │   ├── generate-test.ts           # 试卷生成主逻辑（大模型交互、解析、导出）
│   │   └── build-sample-paper.ts      # 本地示例试卷构建
│   ├── api/                           # API路由
│   │   ├── parse-document/            # 文档解析API（支持Word/PPT/TXT）
│   │   └── extract-knowledge-points/  # 知识点提取API
│   ├── components/                    # 前端核心React组件
│   │   ├── prompt-config-dialog.tsx   # Prompt模板配置与自定义
│   │   ├── test-paper.tsx             # 试卷预览与答案解析展示
│   │   ├── file-upload.tsx            # 文件上传与知识点提取
│   │   ├── openai-config-dialog.tsx   # OpenAI/DeepSeek配置对话框
│   │   └── ...                        # 其他UI组件
│   ├── globals.css                    # 全局样式
│   ├── layout.tsx                     # 根布局
│   └── page.tsx                       # 主页面（试卷生成、导出、Prompt输入输出等）
├── components/ui/                     # UI组件库（Button、Dialog等）
├── lib/                               # 工具函数
├── public/                            # 静态资源
└── README.md                          # 项目文档
```

## 🔧 开发指南

### 本地开发

1. **启动开发服务器**
```bash
npm run dev
```

2. **代码格式化**
```bash
npm run lint
```

3. **构建生产版本**
```bash
npm run build
npm start
```

### 自定义配置

#### 添加新的AI模型
在 `app/components/openai-config-dialog.tsx` 中添加：
```tsx
<SelectItem value="new-model">新模型名称</SelectItem>
```

#### 修改题型配置
在 `app/page.tsx` 中调整 `questionTypes` 配置：
```tsx
questionTypes: {
  // 添加新题型或修改现有配置
  newType: { count: 5, score: 4 }
}
```

## 📊 文档解析详解

### Word文档解析

#### DOCX文件
- **解析引擎**: mammoth.js
- **支持特性**: 
  - 完整文本提取
  - 格式保留
  - 元数据提取
  - 错误消息处理

#### DOC文件
- **主解析**: mammoth.js
- **备用解析**: 智能二进制文本提取
- **特点**: 自动降级，确保兼容性

### PowerPoint解析

#### PPTX文件
- **解析引擎**: JSZip + xml2js
- **提取内容**:
  - 幻灯片文本（按顺序）
  - 演讲者备注
  - XML实体解码
  - 结构化内容组织

#### PPT文件
- **解析策略**: 
  1. 尝试ZIP格式解析
  2. 启发式二进制解析
  - **文本识别**: Unicode字符检测
  - **内容过滤**: 智能垃圾数据过滤

### 解析质量保证

- **乱码检测**: 智能识别和处理乱码内容
- **文本清理**: 自动移除格式标记和无效字符
- **长度限制**: 10K字符上限保护
- **编码支持**: UTF-8、UTF-16LE、ASCII等多编码

## 🎨 界面功能

### 试卷配置页面
- **基本设置**: 年级、难度、主题配置
- **题型配置**: 滑块调节题目数量和分值
- **实时计算**: 动态显示总分和题目分布
- **文档上传**: 拖拽或点击上传教学文档

### 试卷预览页面
- **双栏布局**: 题目和答案分页显示
- **格式化显示**: 专业的试卷排版
- **听力材料**: 独立的听力文本区域
- **答题区域**: 不同题型的专用答题空间

### 导出下载页面
- **PDF导出**: 完整的打印版试卷
- **JSON导出**: 结构化数据备份
- **预览功能**: 导出前内容确认

## 🔍 故障排除

### 常见问题

#### 1. API配置问题
**问题**: "请先配置OpenAI API"
**解决**: 
- 检查API Key是否正确
- 确认Base URL格式
- 验证模型名称

#### 2. 文档解析失败
**问题**: "文档解析失败"
**解决**:
- 检查文件格式是否支持
- 确认文件大小不超过100MB
- 尝试转换为DOCX/PPTX格式

#### 3. 试卷生成错误
**问题**: 生成的试卷格式异常
**解决**:
- 检查网络连接
- 尝试不同的AI模型
- 简化知识点描述

### 调试模式

启用详细日志：
```bash
DEBUG=* npm run dev
```

查看浏览器控制台获取详细错误信息。

## 🤝 贡献指南

### 报告问题
- 使用GitHub Issues报告bug
- 提供详细的复现步骤
- 包含错误日志和截图

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React全栈框架
- [shadcn/ui](https://ui.shadcn.com/) - 现代UI组件库
- [mammoth.js](https://github.com/mwilliamson/mammoth.js) - Word文档解析
- [JSZip](https://stuk.github.io/jszip/) - ZIP文件处理
- [AI SDK](https://sdk.vercel.ai/) - AI集成工具包

## 📞 支持

如有问题或建议，请通过以下方式联系：
- GitHub Issues: [项目Issues页面](https://github.com/wangbigan/english-test-generator/issues)

---

**小学英语试卷生成器** - 让AI助力教育，让教学更高效！ 🎓✨
