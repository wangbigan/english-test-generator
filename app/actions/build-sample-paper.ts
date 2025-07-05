interface TestConfig {
  grade: string
  difficulty: string
  theme: string
  knowledgePoints: string
  totalScore: number
  questionTypes: {
    multipleChoice: { count: number; score: number }
    fillInBlank: { count: number; score: number }
    reading: { count: number; score: number }
    writing: { count: number; score: number }
    listening: { count: number; score: number }
  }
}

export function buildSamplePaper(config: TestConfig) {
  const gradeNames = {
    "1": "一年级",
    "2": "二年级",
    "3": "三年级",
    "4": "四年级",
    "5": "五年级",
    "6": "六年级",
  }

  const difficultyNames = {
    low: "基础",
    medium: "中等",
    high: "提高",
  }

  const gradeName = gradeNames[config.grade as keyof typeof gradeNames] || "小学"
  const difficultyName = difficultyNames[config.difficulty as keyof typeof difficultyNames] || "标准"

  // 按照指定顺序生成题目：听力题、选择题、填空题、阅读理解、写作题
  const sections = []
  const answerKey = []
  let questionId = 1

  // 听力材料
  const listeningMaterial = `
Hello everyone! My name is Lucy. I am eight years old. I live in Beijing with my family. 
I have a mother, a father, and a little brother. My brother is five years old. 
I like to play with my toys and read books. My favorite subject is English. 
I also like to draw pictures and sing songs. On weekends, I often go to the park with my family.
We have a lot of fun together!
  `.trim()

  // 1. 听力题（第一部分）
  if (config.questionTypes.listening.count > 0) {
    const questions = []
    for (let i = 1; i <= config.questionTypes.listening.count; i++) {
      const question = {
        id: questionId,
        question: `根据听力材料回答：What is the girl's name? (听力题 ${i})`,
        answer: "Lucy",
        explanation: "从听力材料开头可以听到'My name is Lucy'，所以答案是Lucy。",
        points: config.questionTypes.listening.score,
      }
      questions.push(question)
      answerKey.push({
        id: questionId,
        answer: question.answer,
        explanation: question.explanation,
      })
      questionId++
    }
    sections.push({
      type: "listening",
      title: "一、听力题",
      questions,
    })
  }

  // 2. 选择题（4个选项，不包含A、B、C、D标签）
  if (config.questionTypes.multipleChoice.count > 0) {
    const questions = []
    const sampleQuestions = [
      {
        question: "What color is the sky?",
        options: ["Blue", "Red", "Green", "Yellow"],
        answer: "A",
        explanation: "天空的颜色是蓝色的，所以正确答案是A. Blue。",
      },
      {
        question: "How many days are there in a week?",
        options: ["Five", "Six", "Seven", "Eight"],
        answer: "C",
        explanation: "一周有七天，所以正确答案是C. Seven。",
      },
      {
        question: "What do you say when you meet someone for the first time?",
        options: ["Goodbye", "Nice to meet you", "See you later", "Good night"],
        answer: "B",
        explanation: "初次见面时应该说'Nice to meet you'，所以正确答案是B。",
      },
      {
        question: "What is the opposite of 'big'?",
        options: ["Small", "Tall", "Fast", "Happy"],
        answer: "A",
        explanation: "'Big'的反义词是'Small'，所以正确答案是A。",
      },
    ]

    for (let i = 1; i <= config.questionTypes.multipleChoice.count; i++) {
      const sampleIndex = (i - 1) % sampleQuestions.length
      const sample = sampleQuestions[sampleIndex]
      const question = {
        id: questionId,
        question: `${sample.question} (示例选择题 ${i})`,
        options: sample.options,
        answer: sample.answer,
        explanation: sample.explanation,
        points: config.questionTypes.multipleChoice.score,
      }
      questions.push(question)
      answerKey.push({
        id: questionId,
        answer: question.answer,
        explanation: question.explanation,
      })
      questionId++
    }
    sections.push({
      type: "multipleChoice",
      title: "二、选择题",
      questions,
    })
  }

  // 3. 填空题
  if (config.questionTypes.fillInBlank.count > 0) {
    const questions = []
    for (let i = 1; i <= config.questionTypes.fillInBlank.count; i++) {
      const question = {
        id: questionId,
        question: `I _______ a student. (示例填空题 ${i})`,
        answer: "am",
        explanation: "主语是I，be动词应该用am，构成'I am a student'（我是一名学生）。",
        points: config.questionTypes.fillInBlank.score,
      }
      questions.push(question)
      answerKey.push({
        id: questionId,
        answer: question.answer,
        explanation: question.explanation,
      })
      questionId++
    }
    sections.push({
      type: "fillInBlank",
      title: "三、填空题",
      questions,
    })
  }

  // 4. 阅读理解
  if (config.questionTypes.reading.count > 0) {
    const questions = []
    for (let i = 1; i <= config.questionTypes.reading.count; i++) {
      const question = {
        id: questionId,
        question: `阅读短文：Tom has a cat. The cat is white. What color is Tom's cat? (示例阅读题 ${i})`,
        answer: "White",
        explanation: "从短文中可以看到'The cat is white'，所以Tom的猫是白色的。",
        points: config.questionTypes.reading.score,
      }
      questions.push(question)
      answerKey.push({
        id: questionId,
        answer: question.answer,
        explanation: question.explanation,
      })
      questionId++
    }
    sections.push({
      type: "reading",
      title: "四、阅读理解",
      questions,
    })
  }

  // 5. 写作题（最后部分）
  if (config.questionTypes.writing.count > 0) {
    const questions = []
    for (let i = 1; i <= config.questionTypes.writing.count; i++) {
      const question = {
        id: questionId,
        question: `请写一篇关于你的家庭的短文，不少于50个单词。(示例写作题 ${i})`,
        answer:
          "参考答案：My family has three people. They are my father, my mother and me. My father is a teacher. My mother is a doctor. I am a student. We love each other very much.",
        explanation:
          "写作题评分要点：1. 内容完整，包含家庭成员介绍；2. 语法正确，时态一致；3. 词汇使用恰当；4. 字数符合要求；5. 书写工整。",
        points: config.questionTypes.writing.score,
      }
      questions.push(question)
      answerKey.push({
        id: questionId,
        answer: question.answer,
        explanation: question.explanation,
      })
      questionId++
    }
    sections.push({
      type: "writing",
      title: "五、写作题",
      questions,
    })
  }

  return {
    title: `${gradeName}英语${difficultyName}测试`,
    subtitle: `主题：${config.theme || "综合练习"}`,
    instructions: `本试卷共${sections.length}个部分，总分${config.totalScore}分。请仔细阅读题目，认真作答。听力题请仔细听录音。考试时间60分钟。`,
    totalScore: config.totalScore,
    listeningMaterial: config.questionTypes.listening.count > 0 ? listeningMaterial : undefined,
    sections,
    answerKey,
  }
}
