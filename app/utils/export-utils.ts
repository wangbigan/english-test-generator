import { GeneratedTest, TestConfig } from "../types/shared"
import { EXPORT_TEMPLATES } from "../constants"

/**
 * 生成PDF导出的HTML模板
 * @param test - 生成的试卷数据
 * @returns HTML字符串
 */
function generatePDFTemplate(test: GeneratedTest): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${test.title}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .theme-info {
          background-color: #f0f8ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          border-left: 4px solid #4a90e2;
          text-align: left;
        }
        .scenario-info {
          background-color: #fff5f5;
          padding: 12px;
          border-radius: 4px;
          margin: 10px 0;
          border-left: 3px solid #e53e3e;
          font-size: 14px;
        }
        .section { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
        }
        .question { 
          margin-bottom: 20px; 
          padding: 10px;
          border-left: 3px solid #007bff;
          background-color: #f8f9fa;
        }
        .options { 
          margin-left: 20px; 
          margin-top: 10px;
        }
        .option-item {
          margin-bottom: 5px;
        }
        .listening-material {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 4px solid #2196f3;
        }
        .answer-section {
          page-break-before: always;
          margin-top: 40px;
        }
        .answer-item {
          margin-bottom: 20px;
          padding: 15px;
          border-left: 4px solid #4caf50;
          background-color: #f1f8e9;
        }
        .answer-header {
          font-weight: bold;
          color: #2e7d32;
          margin-bottom: 8px;
        }
        .explanation {
          color: #555;
          font-size: 14px;
          line-height: 1.5;
        }
        @media print { 
          body { margin: 0; }
          .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>
      <!-- 试卷题目部分 -->
      <div class="header">
        <div style="background: #fffbe6; border-left: 4px solid #ffe58f; color: #ad8b00; padding: 10px 16px; border-radius: 4px; margin-bottom: 18px; font-size: 15px;">
          本试卷内容由AI大模型自动生成，仅供参考。
        </div>
        <h1>${test.title}</h1>
        <p style="font-size: 18px; color: #666;">${test.subtitle}</p>
        ${generateThemeInfoHTML(test)}
        <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 14px;">
          <span>姓名：_______________</span>
          <span>班级：_______________</span>
          <span>学号：_______________</span>
          <span style="font-weight: bold;">总分：${test.totalScore}分</span>
        </div>
        <div style="margin-top: 15px; text-align: left; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
          <strong>考试说明：</strong>
          <p style="margin-top: 8px;">${test.instructions}</p>
        </div>
      </div>

      ${generateListeningMaterialHTML(test.listeningMaterial)}
      ${generateSectionsHTML(test.sections)}
      ${generateAnswersHTML(test)}
    </body>
    </html>
  `
}

/**
 * 生成听力材料HTML
 * @param listeningMaterial - 听力材料文本
 * @returns HTML字符串
 */
function generateListeningMaterialHTML(listeningMaterial?: string): string {
  if (!listeningMaterial) return ""
  
  return `
    <div class="listening-material">
      <h3 style="color: #1976d2; margin-bottom: 10px;">听力材料</h3>
      <div style="white-space: pre-line;">${listeningMaterial}</div>
    </div>
  `
}

/**
 * 生成主题信息HTML
 * @param test - 试卷数据
 * @returns HTML字符串
 */
function generateThemeInfoHTML(test: GeneratedTest): string {
  if (!test.mainTheme && !test.backgroundDescription) return ""
  
  return `
    <div class="theme-info">
      <h3 style="color: #4a90e2; margin-bottom: 10px; font-size: 16px;">📚 主题背景</h3>
      ${test.mainTheme ? `<p style="margin-bottom: 8px;"><strong>主题：</strong>${test.mainTheme}</p>` : ""}
      ${test.backgroundDescription ? `<p style="margin: 0; color: #555;">${test.backgroundDescription}</p>` : ""}
    </div>
  `
}

/**
 * 生成场景信息HTML
 * @param section - section数据
 * @returns HTML字符串
 */
function generateScenarioInfoHTML(section: GeneratedTest['sections'][0]): string {
  if (!section.scenarioTitle && !section.scenarioDescription) return ""
  
  return `
    <div class="scenario-info">
      <h4 style="color: #e53e3e; margin-bottom: 8px; font-size: 14px;">🎭 场景设定</h4>
      ${section.scenarioTitle ? `<p style="margin-bottom: 6px;"><strong>场景：</strong>${section.scenarioTitle}</p>` : ""}
      ${section.scenarioDescription ? `<p style="margin-bottom: 6px; color: #555;">${section.scenarioDescription}</p>` : ""}
      ${section.scenarioKnowledgePoints && section.scenarioKnowledgePoints.length > 0 ? 
        `<p style="margin: 0; font-size: 12px;"><strong>涉及知识点：</strong>${section.scenarioKnowledgePoints.join('、')}</p>` : ""}
    </div>
  `
}

/**
 * 生成试卷sections的HTML
 * @param sections - 试卷sections数组
 * @returns HTML字符串
 */
function generateSectionsHTML(sections: GeneratedTest['sections']): string {
  return sections
    .map(
      (section) => `
        <div class="section">
          <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
            ${section.title} 
            <span style="font-size: 14px; color: #666; font-weight: normal;">
              (${Array.isArray(section.questions) ? section.questions.length : 0}题，共${Array.isArray(section.questions) ? section.questions.reduce((sum: number, q) => sum + q.points, 0) : 0}分)
            </span>
          </h2>
          ${generateScenarioInfoHTML(section)}
          ${generateQuestionsHTML(section.questions)}
        </div>
      `
    )
    .join("")
}

/**
 * 生成题目HTML
 * @param questions - 题目数组
 * @returns HTML字符串
 */
function generateQuestionsHTML(questions: GeneratedTest['sections'][0]['questions']): string {
  if (!Array.isArray(questions)) return ""
  
  return questions
    .map(
      (q, i) => `
        <div class="question">
          <p style="margin-bottom: 10px;">
            <strong>${i + 1}. ${q.question}</strong> 
            <span style="color: #007bff; font-size: 12px;">(${q.points}分)</span>
          </p>
          ${generateOptionsHTML(q.options)}
        </div>
      `
    )
    .join("")
}

/**
 * 生成选项HTML
 * @param options - 选项数组
 * @returns HTML字符串
 */
function generateOptionsHTML(options?: string[]): string {
  if (!options) {
    return `
      <div style="margin-top: 10px;">
        <span style="color: #666; font-size: 14px;">答案：</span>
        <span style="border-bottom: 1px solid #333; display: inline-block; width: 200px; height: 20px;"></span>
      </div>
    `
  }
  
  return `
    <div class="options">
      ${options
        .map(
          (opt, j) => `
            <div class="option-item">
              <strong>${String.fromCharCode(65 + j)}.</strong> ${opt}
            </div>
          `
        )
        .join("")}
    </div>
  `
}

/**
 * 生成答案解析HTML
 * @param test - 试卷数据
 * @returns HTML字符串
 */
function generateAnswersHTML(test: GeneratedTest): string {
  let qNum = 1
  let html = ""
  
  test.sections.forEach(section => {
    if (Array.isArray(section.questions)) {
      section.questions.forEach(q => {
        html += `
          <div class="answer-item">
            <div class="answer-header">
              第${qNum++}题 - 答案：${q.answer ?? "-"}
            </div>
            <div class="explanation">${q.explanation ?? "-"}</div>
          </div>
        `
      })
    }
  })
  
  return `
    <!-- 答案解析部分 -->
    <div class="answer-section page-break">
      <div class="header">
        <div style="background: #fffbe6; border-left: 4px solid #ffe58f; color: #ad8b00; padding: 10px 16px; border-radius: 4px; margin-bottom: 18px; font-size: 15px;">
          本试卷内容由AI大模型自动生成，仅供参考。
        </div>
        <h1>答案与解析</h1>
        <p style="font-size: 18px; color: #666;">${test.title}</p>
      </div>
      ${html}
    </div>
  `
}

/**
 * 生成Word导出的HTML模板
 * @param test - 生成的试卷数据
 * @returns HTML字符串
 */
function generateWordTemplate(test: GeneratedTest): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${test.title}</title>
    </head>
    <body>
      <div style="background: #fffbe6; border-left: 4px solid #ffe58f; color: #ad8b00; padding: 10px 16px; border-radius: 4px; margin-bottom: 18px; font-size: 15px;">
        本试卷内容由AI大模型自动生成，仅供参考。
      </div>
      <h1 style="text-align:center;">${test.title}</h1>
      <p style="text-align:center; font-size: 18px; color: #666;">${test.subtitle}</p>
      ${generateWordThemeInfo(test)}
      <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 14px;">
        <span>姓名：_______________</span>
        <span>班级：_______________</span>
        <span>学号：_______________</span>
        <span style="font-weight: bold;">总分：${test.totalScore}分</span>
      </div>
      <div style="margin-top: 15px; text-align: left; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <strong>考试说明：</strong>
        <p style="margin-top: 8px;">${test.instructions}</p>
      </div>
      ${generateWordListeningMaterial(test.listeningMaterial)}
      ${generateWordSections(test.sections)}
      ${generateWordAnswers(test)}
    </body>
    </html>
  `
}

/**
 * 生成Word格式的听力材料
 */
function generateWordListeningMaterial(listeningMaterial?: string): string {
  if (!listeningMaterial) return ""
  
  return `
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
      <h3 style="color: #1976d2; margin-bottom: 10px;">听力材料</h3>
      <div style="white-space: pre-line;">${listeningMaterial}</div>
    </div>
  `
}

/**
 * 生成Word格式的主题信息
 * @param test - 试卷数据
 * @returns HTML字符串
 */
function generateWordThemeInfo(test: GeneratedTest): string {
  if (!test.mainTheme && !test.backgroundDescription) return ""
  
  return `
    <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4a90e2; text-align: left;">
      <h3 style="color: #4a90e2; margin-bottom: 10px; font-size: 16px;">📚 主题背景</h3>
      ${test.mainTheme ? `<p style="margin-bottom: 8px;"><strong>主题：</strong>${test.mainTheme}</p>` : ""}
      ${test.backgroundDescription ? `<p style="margin: 0; color: #555;">${test.backgroundDescription}</p>` : ""}
    </div>
  `
}

/**
 * 生成Word格式的场景信息
 * @param section - section数据
 * @returns HTML字符串
 */
function generateWordScenarioInfo(section: GeneratedTest['sections'][0]): string {
  if (!section.scenarioTitle && !section.scenarioDescription) return ""
  
  return `
    <div style="background-color: #fff5f5; padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 3px solid #e53e3e; font-size: 14px;">
      <h4 style="color: #e53e3e; margin-bottom: 8px; font-size: 14px;">🎭 场景设定</h4>
      ${section.scenarioTitle ? `<p style="margin-bottom: 6px;"><strong>场景：</strong>${section.scenarioTitle}</p>` : ""}
      ${section.scenarioDescription ? `<p style="margin-bottom: 6px; color: #555;">${section.scenarioDescription}</p>` : ""}
      ${section.scenarioKnowledgePoints && section.scenarioKnowledgePoints.length > 0 ? 
        `<p style="margin: 0; font-size: 12px;"><strong>涉及知识点：</strong>${section.scenarioKnowledgePoints.join('、')}</p>` : ""}
    </div>
  `
}

/**
 * 生成Word格式的sections
 */
function generateWordSections(sections: GeneratedTest['sections']): string {
  return sections
    .map(
      (section) => `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
            ${section.title}
            <span style="font-size: 14px; color: #666; font-weight: normal;">
              (${Array.isArray(section.questions) ? section.questions.length : 0}题，共${Array.isArray(section.questions) ? section.questions.reduce((sum: number, q) => sum + q.points, 0) : 0}分)
            </span>
          </h2>
          ${generateWordScenarioInfo(section)}
          ${generateWordQuestions(section.questions)}
        </div>
      `
    )
    .join("")
}

/**
 * 生成Word格式的题目
 */
function generateWordQuestions(questions: GeneratedTest['sections'][0]['questions']): string {
  if (!Array.isArray(questions)) return ""
  
  return questions
    .map(
      (q, i) => `
        <div style="margin-bottom: 20px; padding: 10px; border-left: 3px solid #007bff; background-color: #f8f9fa;">
          <p style="margin-bottom: 10px;"><strong>${i + 1}. ${q.question}</strong> <span style="color: #007bff; font-size: 12px;">(${q.points}分)</span></p>
          ${generateWordOptions(q.options)}
        </div>
      `
    )
    .join("")
}

/**
 * 生成Word格式的选项
 */
function generateWordOptions(options?: string[]): string {
  if (!options) {
    return `<div style="margin-top: 10px;"><span style="color: #666; font-size: 14px;">答案：</span><span style="border-bottom: 1px solid #333; display: inline-block; width: 200px; height: 20px;"></span></div>`
  }
  
  return `
    <div style="margin-left: 20px; margin-top: 10px;">
      ${options
        .map(
          (opt, j) => `<div style="margin-bottom: 5px;"><strong>${String.fromCharCode(65 + j)}.</strong> ${opt}</div>`
        )
        .join("")}
    </div>
  `
}

/**
 * 生成Word格式的答案解析
 */
function generateWordAnswers(test: GeneratedTest): string {
  let qNum = 1
  let html = ""
  
  test.sections.forEach(section => {
    if (Array.isArray(section.questions)) {
      section.questions.forEach(q => {
        html += `
          <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #4caf50; background-color: #f1f8e9;">
            <div style="font-weight: bold; color: #2e7d32; margin-bottom: 8px;">第${qNum++}题 - 答案：${q.answer ?? "-"}</div>
            <div style="color: #555; font-size: 14px; line-height: 1.5;">${q.explanation ?? "-"}</div>
          </div>
        `
      })
    }
  })
  
  return `
    <div style="page-break-before: always; margin-top: 40px;"></div>
    <div style="background: #fffbe6; border-left: 4px solid #ffe58f; color: #ad8b00; padding: 10px 16px; border-radius: 4px; margin-bottom: 18px; font-size: 15px;">
      本试卷内容由AI大模型自动生成，仅供参考。
    </div>
    <h1>答案与解析</h1>
    <p style="font-size: 18px; color: #666;">${test.title}</p>
    ${html}
  `
}

/**
 * 导出PDF文件
 * @param test - 生成的试卷数据
 */
export function exportToPDF(test: GeneratedTest): void {
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(generatePDFTemplate(test))
    printWindow.document.close()
    printWindow.print()
  }
}

/**
 * 导出Word文件
 * @param test - 生成的试卷数据
 */
export function exportToWord(test: GeneratedTest): void {
  const wordHtml = generateWordTemplate(test)
  const wordBlob = new Blob([wordHtml], { type: "application/msword" })
  const wordUrl = URL.createObjectURL(wordBlob)
  const wordLink = document.createElement("a")
  wordLink.href = wordUrl
  wordLink.download = EXPORT_TEMPLATES.WORD_FILENAME(test.title)
  document.body.appendChild(wordLink)
  wordLink.click()
  document.body.removeChild(wordLink)
  URL.revokeObjectURL(wordUrl)
}

/**
 * 导出JSON文件
 * @param test - 生成的试卷数据
 * @param config - 试卷配置
 */
export function exportToJSON(test: GeneratedTest, config: TestConfig): void {
  const completeData = {
    ...test,
    exportTime: new Date().toISOString(),
    config: {
      grade: config.grade,
      difficulty: config.difficulty,
      theme: config.theme,
      knowledgePoints: config.knowledgePoints,
      questionTypes: config.questionTypes,
    },
  }
  
  const dataStr = JSON.stringify(completeData, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement("a")
  link.href = url
  link.download = EXPORT_TEMPLATES.JSON_FILENAME(test.title)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 统一的导出处理函数
 * @param type - 导出类型
 * @param test - 试卷数据
 * @param config - 试卷配置（JSON导出时需要）
 */
export function handleExport(
  type: "pdf" | "json" | "word",
  test: GeneratedTest | null,
  config?: TestConfig
): void {
  if (!test) {
    alert("请先生成试卷")
    return
  }

  switch (type) {
    case "pdf":
      exportToPDF(test)
      break
    case "word":
      exportToWord(test)
      break
    case "json":
      if (!config) {
        alert("导出JSON需要提供配置信息")
        return
      }
      exportToJSON(test, config)
      break
  }
}