const AI_MODES = Object.freeze({
  assistant: {
    id: "assistant",
    label: "Помощник",
    description: "Короткие и практичные ответы на любые учебные вопросы.",
    instruction: "Работай как универсальный учебный помощник. Сначала дай прямой ответ, затем конкретные шаги.",
  },
  mentor: {
    id: "mentor",
    label: "Наставник",
    description: "Разбор задачи по шагам с вопросами и обратной связью.",
    instruction: "Работай как доброжелательный наставник. Не выполняй всё за ученика: объясняй ход решения, давай следующий небольшой шаг и критерий самопроверки.",
  },
  ideas: {
    id: "ideas",
    label: "Идеи",
    description: "Концепции, хуки и варианты для роликов и портфолио.",
    instruction: "Работай как креативный редактор. Предлагай несколько различающихся концепций, объясняй сильную сторону каждой и избегай банальных формулировок.",
  },
  reviewer: {
    id: "reviewer",
    label: "Разбор",
    description: "Конструктивная проверка текста, сценария или монтажного решения.",
    instruction: "Работай как строгий, но конструктивный ревьюер. Разделяй ответ на сильные стороны, проблемы по приоритету и точные исправления.",
  },
});

const AI_ACTIONS = Object.freeze({
  answer: {
    id: "answer",
    label: "Ответ",
    description: "Обычный ответ в выбранном режиме.",
    instruction: "Ответь в естественном формате для вопроса пользователя.",
  },
  summary: {
    id: "summary",
    label: "Конспект",
    description: "Сжатый структурированный конспект исходного материала.",
    instruction: "Преобразуй материал пользователя в структурированный конспект: главная мысль, ключевые тезисы, термины и короткий итог. Не добавляй факты, которых нет в исходнике.",
  },
  video_plan: {
    id: "video_plan",
    label: "План ролика",
    description: "Сценарный и монтажный план по идее пользователя.",
    instruction: "Создай практичный план ролика: цель, хук, последовательность сцен с примерным таймингом, текстовые акценты, звук и финальный CTA.",
  },
  quiz: {
    id: "quiz",
    label: "Мини-тест",
    description: "Пять вопросов для самопроверки с ответами в конце.",
    instruction: "Составь мини-тест из пяти содержательных вопросов по материалу пользователя. Дай варианты ответов там, где это уместно, а ключ и краткие объяснения помести после всех вопросов.",
  },
  rewrite: {
    id: "rewrite",
    label: "Улучшить текст",
    description: "Редактура текста без изменения смысла и голоса автора.",
    instruction: "Отредактируй текст пользователя: сохрани смысл и голос автора, убери повторы, сделай структуру и формулировки яснее. После результата кратко перечисли основные правки.",
  },
});

function normalizeOption(value, options, fallback) {
  const key = String(value || "").trim().toLowerCase();
  return options[key] ? key : fallback;
}

function normalizeAIMode(value) {
  return normalizeOption(value, AI_MODES, "assistant");
}

function normalizeAIAction(value) {
  return normalizeOption(value, AI_ACTIONS, "answer");
}

function publicAIOptions() {
  return {
    modes: Object.values(AI_MODES).map(({ instruction: _instruction, ...mode }) => mode),
    actions: Object.values(AI_ACTIONS).map(({ instruction: _instruction, ...action }) => action),
  };
}

function optionInstructions(mode, action) {
  const safeMode = normalizeAIMode(mode);
  const safeAction = normalizeAIAction(action);
  return {
    mode: safeMode,
    action: safeAction,
    modeInstruction: AI_MODES[safeMode].instruction,
    actionInstruction: AI_ACTIONS[safeAction].instruction,
  };
}

function conversationTitle(message) {
  const compact = String(message || "").replace(/\s+/g, " ").trim();
  if (!compact) return "Новый диалог";
  return compact.length > 64 ? `${compact.slice(0, 61).trimEnd()}…` : compact;
}

module.exports = {
  AI_MODES,
  AI_ACTIONS,
  normalizeAIMode,
  normalizeAIAction,
  publicAIOptions,
  optionInstructions,
  conversationTitle,
};
