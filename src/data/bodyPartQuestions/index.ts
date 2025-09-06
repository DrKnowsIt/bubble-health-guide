// Body part question bank loader and manager

export interface QuestionOption {
  id: string;
  text: string;
  options: string[];
}

export interface QuestionCategory {
  priority: number;
  questions: QuestionOption[];
}

export interface BodyPartQuestions {
  bodyPart: string;
  categories: Record<string, QuestionCategory>;
}

// Topic tracking for covered question categories
export interface TopicTracker {
  [bodyPart: string]: {
    [categoryName: string]: boolean;
  };
}

// Map anatomy context to question file names
const anatomyToQuestionFile: Record<string, string> = {
  'head-front': 'head',
  'head-back': 'head', 
  'head-left': 'head',
  'head-right': 'head',
  'neck-front': 'neck',
  'neck-back': 'neck',
  'neck-left': 'neck', 
  'neck-right': 'neck',
  'chest-front': 'upperTorso',
  'chest-back': 'upperTorso',
  'abdomen-front': 'abdomen',
  'abdomen-back': 'abdomen',
  'torso-front': 'upperTorso',
  'torso-back': 'upperTorso',
  'upper-torso': 'upperTorso',
  'lower-torso': 'lowerTorso',
  'upperArm-left': 'upperArms',
  'upperArm-right': 'upperArms',
  'lowerArm-left': 'lowerArms',
  'lowerArm-right': 'lowerArms',
  'upperLeg-left': 'upperLegs',
  'upperLeg-right': 'upperLegs',
  'lowerLeg-left': 'lowerLegs',
  'lowerLeg-right': 'lowerLegs',
  'shoulder-left': 'upperArms',
  'shoulder-right': 'upperArms',
  'hip-left': 'upperLegs',
  'hip-right': 'upperLegs'
};

// Load question bank for specific body part
export async function loadBodyPartQuestions(anatomyContext?: string): Promise<BodyPartQuestions | null> {
  if (!anatomyContext) return null;
  
  const questionFileName = anatomyToQuestionFile[anatomyContext];
  if (!questionFileName) return null;

  try {
    // Dynamic import of the JSON file
    const questionBank = await import(`./${questionFileName}.json`);
    return questionBank.default as BodyPartQuestions;
  } catch (error) {
    console.error(`Failed to load question bank for ${questionFileName}:`, error);
    return null;
  }
}

// Get next uncovered question based on topic tracking
export function getNextUncoveredQuestion(
  questionBank: BodyPartQuestions,
  topicTracker: TopicTracker,
  conversationPath: Array<{ question: string; answer: string }>
): QuestionOption | null {
  const bodyPart = questionBank.bodyPart;
  const coveredTopics = topicTracker[bodyPart] || {};
  
  // Get categories sorted by priority
  const sortedCategories = Object.entries(questionBank.categories)
    .sort(([, a], [, b]) => a.priority - b.priority);

  // Find first uncovered category
  for (const [categoryName, category] of sortedCategories) {
    if (!coveredTopics[categoryName]) {
      // Get questions from this category that haven't been asked
      const askedQuestions = conversationPath.map(item => item.question.toLowerCase());
      
      for (const question of category.questions) {
        const isAlreadyAsked = askedQuestions.some(asked => 
          asked.includes(question.text.toLowerCase().substring(0, 20))
        );
        
        if (!isAlreadyAsked) {
          return question;
        }
      }
      
      // If all questions in this category were asked, mark it as covered
      if (!topicTracker[bodyPart]) topicTracker[bodyPart] = {};
      topicTracker[bodyPart][categoryName] = true;
    }
  }

  return null;
}

// Update topic tracker when a question is answered
export function markTopicProgress(
  topicTracker: TopicTracker,
  bodyPart: string,
  questionId: string,
  questionBank: BodyPartQuestions
): void {
  // Find which category this question belongs to
  for (const [categoryName, category] of Object.entries(questionBank.categories)) {
    const questionExists = category.questions.some(q => q.id === questionId);
    if (questionExists) {
      if (!topicTracker[bodyPart]) topicTracker[bodyPart] = {};
      topicTracker[bodyPart][categoryName] = true;
      break;
    }
  }
}

// Check if minimum coverage is achieved for session completion
export function hasMinimumCoverage(
  topicTracker: TopicTracker,
  bodyPart: string,
  minimumCategories: number = 3
): boolean {
  const coveredTopics = topicTracker[bodyPart] || {};
  const coveredCount = Object.values(coveredTopics).filter(Boolean).length;
  return coveredCount >= minimumCategories;
}

// Get coverage progress for UI display
export function getCoverageProgress(
  topicTracker: TopicTracker,
  bodyPart: string,
  questionBank: BodyPartQuestions
): { covered: number; total: number; categories: string[] } {
  const coveredTopics = topicTracker[bodyPart] || {};
  const totalCategories = Object.keys(questionBank.categories);
  const coveredCategories = Object.entries(coveredTopics)
    .filter(([, covered]) => covered)
    .map(([category]) => category);

  return {
    covered: coveredCategories.length,
    total: totalCategories.length,
    categories: coveredCategories
  };
}