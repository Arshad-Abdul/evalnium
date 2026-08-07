import Papa from 'papaparse';
import * as mammoth from 'mammoth';
import type { ParsedQuestion, ParseResult } from '../types/quiz';

/**
 * Universal Smart Text Parser for Questions & Answers
 */
export function parsePlainText(text: string): ParseResult {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  
  if (!text || !text.trim()) {
    return { questions: [], rawText: text, errors: ['File or text is empty.'] };
  }

  // Normalize line endings
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Isolated Answer Key section at bottom (e.g. "Answer Key:", "Answers:", "Key:")
  let mainContent = cleanText;
  const answerKeyMap: Record<string, string> = {};
  
  const answerKeySectionMatch = cleanText.match(/(?:Answer Key|Answers|Key|उत्तर कुंजी)\s*:?\n([\s\S]+)$/i);
  if (answerKeySectionMatch) {
    mainContent = cleanText.substring(0, answerKeySectionMatch.index);
    const keyText = answerKeySectionMatch[1];
    const keyMatches = [...keyText.matchAll(/(?:Q?(\d+))\s*[\.\:\-\)\=]?\s*[\(\[]?\s*([A-D1-4])\s*[\)\]]?/gi)];
    for (const match of keyMatches) {
      const qNum = match[1];
      let val = match[2].toUpperCase();
      if (val === '1') val = 'A';
      else if (val === '2') val = 'B';
      else if (val === '3') val = 'C';
      else if (val === '4') val = 'D';
      answerKeyMap[qNum] = val;
    }
  }

  // Strategy 1: Split by Question Headers (e.g. Q1., Question 1, 1., 1), [Q1])
  let rawBlocks = mainContent.split(/(?:\n|^)(?=(?:Q(?:uestion)?[\s\.\_\-]*\d+|\d+[\.\:\)]|\*?\*?\d+[\.\:\)]\*?\*?)\s+)/i);
  
  // Strategy 2 Fallback: If Question Headers split produced only 1 block, split by double blank lines (\n\s*\n+)
  if (rawBlocks.length <= 1) {
    rawBlocks = mainContent.split(/\n\s*\n+/);
  }

  let qIndex = 1;
  for (let block of rawBlocks) {
    block = block.trim();
    if (!block) continue;

    // Detect question number & header
    const qHeaderMatch = block.match(/^(?:Q(?:uestion)?[\s\.\_\-]*(\d+)[\.\:\)]?|\*?\*?(\d+)[\.\:\)]\*?\*?)\s*([\s\S]+)/i);
    let qNumberStr = (qIndex++).toString();
    let remainingBlock = block;

    if (qHeaderMatch) {
      qNumberStr = qHeaderMatch[1] || qHeaderMatch[2] || qNumberStr;
      remainingBlock = qHeaderMatch[3];
    }

    // Extract inline answer if present
    let inlineAnswer = '';
    let inlineExplanation = '';

    const ansMatch = remainingBlock.match(/(?:Answer|Ans|Correct Answer|Correct Option|Correct_Answer|Key|उत्तर)\s*:?\s*[\(\[]?\s*([A-D1-4])\s*[\)\]]?(?:\n|$)/i);
    if (ansMatch) {
      let val = ansMatch[1].toUpperCase();
      if (val === '1') val = 'A';
      if (val === '2') val = 'B';
      if (val === '3') val = 'C';
      if (val === '4') val = 'D';
      inlineAnswer = val;
      remainingBlock = remainingBlock.replace(ansMatch[0], '\n');
    }

    const expMatch = remainingBlock.match(/(?:Explanation|Exp|Reason|व्याख्या|स्पष्टीकरण)\s*:?\s*([\s\S]+)$/i);
    if (expMatch) {
      inlineExplanation = expMatch[1].trim();
      remainingBlock = remainingBlock.replace(expMatch[0], '');
    }

    // Extract options: A), A., (A), [A], A-, a), a., 1), 1.
    let optionMatches = [...remainingBlock.matchAll(/(?:^|\n)\s*[\*\-]?\s*[\(\[]?\s*([A-D1-4])[\.\:\)\-]\s*([\s\S]+?)(?=(?:\n\s*[\*\-]?\s*[\(\[]?\s*[A-D1-4][\.\:\)\-]|\n*$))/gi)];

    if (optionMatches.length < 2) {
      optionMatches = [...remainingBlock.matchAll(/[\(\[]?\s*([A-D])[\.\:\)\-]\s*([^\n\(\)A-D]+?)(?=(?:[\(\[]?\s*[A-D][\.\:\)\-]|$))/gi)];
    }

    let questionText = remainingBlock;
    const options: { id: string; text: string }[] = [];

    if (optionMatches.length >= 2) {
      const firstOptIndex = optionMatches[0].index || 0;
      questionText = remainingBlock.substring(0, firstOptIndex).trim();
      questionText = questionText.replace(/(?:\n|^)\s*(?:Options\s*\/?\s*विकल्प|Options|विकल्प)\s*:?\s*$/i, '').trim();

      for (const optMatch of optionMatches) {
        let optId = optMatch[1].toUpperCase();
        if (optId === '1') optId = 'A';
        else if (optId === '2') optId = 'B';
        else if (optId === '3') optId = 'C';
        else if (optId === '4') optId = 'D';

        const optText = optMatch[2].trim().replace(/\n+/g, ' ');
        if (!options.some(o => o.id === optId)) {
          options.push({ id: optId, text: optText });
        }
      }
    } else {
      const lines = remainingBlock.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length >= 3) {
        questionText = lines[0];
        let optChar = 65; // 'A'
        for (let i = 1; i < lines.length && i <= 4; i++) {
          options.push({ id: String.fromCharCode(optChar++), text: lines[i] });
        }
      }
    }

    questionText = questionText.replace(/^[\#\*\s\d\.\:\)]+/, '').trim();
    
    // Extract English & Hindi blocks if present in questionText
    let questionEnglish: string | undefined;
    let questionHindi: string | undefined;
    const engMatch = questionText.match(/(?:English|Eng)\s*:?\s*([\s\S]+?)(?=(?:\n\s*(?:हिन्दी|Hindi)\s*:?|$))/i);
    const hinMatch = questionText.match(/(?:हिन्दी|Hindi)\s*:?\s*([\s\S]+?)(?=(?:\n\s*(?:English|Eng)\s*:?|$))/i);
    if (engMatch) questionEnglish = engMatch[1].trim();
    if (hinMatch) questionHindi = hinMatch[1].trim();

    const finalAnswer = inlineAnswer || answerKeyMap[qNumberStr] || (options.length > 0 ? options[0].id : 'A');

    const correctOpt = options.find(o => o.id === finalAnswer);
    const defaultExp = correctOpt
      ? `Option (${finalAnswer}): "${correctOpt.text}" is the correct answer.`
      : `Option (${finalAnswer}) is the correct answer.`;

    const finalExplanation = inlineExplanation || defaultExp;

    const isValid = Boolean(questionText && options.length >= 2);
    let validationError: string | undefined;

    if (!questionText) validationError = 'Missing question text';
    else if (options.length < 2) validationError = 'Fewer than 2 options found';

    if (questionText && (options.length >= 2 || isValid)) {
      questions.push({
        tempId: `parsed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        questionText,
        questionEnglish,
        questionHindi,
        options: options.length >= 2 ? options : [
          { id: 'A', text: 'True' },
          { id: 'B', text: 'False' }
        ],
        correctOptionId: finalAnswer,
        explanation: finalExplanation,
        isValid,
        validationError
      });
    }
  }

  if (questions.length === 0) {
    errors.push('No valid questions could be detected. Please ensure questions have options (A, B, C, D) or standard formatting.');
  }

  return { questions, rawText: text, errors };
}

/**
 * CSV Parser using PapaParse — Supports Bilingual Columns (Question_English, Question_Hindi, Explanation_English, Explanation_Hindi)
 */
export function parseCSV(csvContent: string): ParseResult {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach(err => errors.push(`CSV Row ${err.row}: ${err.message}`));
  }

  parsed.data.forEach((row, idx) => {
    const findValue = (...keys: string[]): string => {
      for (const k of Object.keys(row)) {
        const cleanK = k.trim().toLowerCase();
        if (keys.some(key => cleanK === key.toLowerCase() || cleanK.includes(key.toLowerCase()))) {
          return (row[k] || '').trim();
        }
      }
      return '';
    };

    const questionEnglish = findValue('question_english', 'questionenglish', 'english');
    const questionHindi = findValue('question_hindi', 'questionhindi', 'hindi');
    let questionText = findValue('question', 'qtext', 'questiontext', 'prompt');

    if (questionEnglish && questionHindi) {
      questionText = `English: ${questionEnglish}\n\nहिन्दी: ${questionHindi}`;
    } else if (questionEnglish) {
      questionText = questionEnglish;
    } else if (questionHindi) {
      questionText = questionHindi;
    }

    const optA = findValue('option_a', 'option a', 'opta', 'a');
    const optB = findValue('option_b', 'option b', 'optb', 'b');
    const optC = findValue('option_c', 'option c', 'optc', 'c');
    const optD = findValue('option_d', 'option d', 'optd', 'd');
    
    let answer = findValue('correct_answer', 'correct answer', 'answer', 'correct_option', 'key', 'ans').toUpperCase();
    if (answer.startsWith('OPTION ')) answer = answer.replace('OPTION ', '').trim();
    if (['1', '2', '3', '4'].includes(answer)) {
      answer = String.fromCharCode(64 + parseInt(answer, 10));
    }
    if (!['A', 'B', 'C', 'D'].includes(answer)) {
      answer = 'A';
    }

    const explanationEnglish = findValue('explanation_english', 'explanationenglish');
    const explanationHindi = findValue('explanation_hindi', 'explanationhindi');
    let explanation = findValue('explanation', 'exp', 'reason');

    if (explanationEnglish && explanationHindi) {
      explanation = `English: ${explanationEnglish}\n\nहिन्दी: ${explanationHindi}`;
    } else if (explanationEnglish) {
      explanation = explanationEnglish;
    } else if (explanationHindi) {
      explanation = explanationHindi;
    }

    const options: { id: string; text: string }[] = [];
    if (optA) options.push({ id: 'A', text: optA });
    if (optB) options.push({ id: 'B', text: optB });
    if (optC) options.push({ id: 'C', text: optC });
    if (optD) options.push({ id: 'D', text: optD });

    const correctOpt = options.find(o => o.id === answer);
    const defaultExp = correctOpt
      ? `Option (${answer}): "${correctOpt.text}" is the correct answer.`
      : `Option (${answer}) is the correct answer.`;

    const finalExplanation = explanation || defaultExp;
    const isValid = Boolean(questionText && options.length >= 2);

    if (questionText || options.length > 0) {
      questions.push({
        tempId: `csv_${idx}_${Date.now()}`,
        questionText: questionText || `Question ${idx + 1}`,
        questionEnglish: questionEnglish || (questionText && !questionHindi ? questionText : undefined),
        questionHindi: questionHindi || undefined,
        options: options.length >= 2 ? options : [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' }
        ],
        correctOptionId: answer,
        explanation: finalExplanation,
        explanationEnglish: explanationEnglish || (explanation && !explanationHindi ? explanation : undefined),
        explanationHindi: explanationHindi || undefined,
        isValid,
        validationError: !isValid ? 'Requires a question title and at least 2 options' : undefined
      });
    }
  });

  return { questions, errors };
}

/**
 * Markdown Parser
 */
export function parseMarkdown(mdText: string): ParseResult {
  const titleMatch = mdText.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : undefined;

  const result = parsePlainText(mdText);
  if (title) {
    result.title = title;
  }
  return result;
}

/**
 * Word DOCX File Parser
 */
export async function parseDOCX(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const docResult = await mammoth.extractRawText({ arrayBuffer });
    const text = docResult.value;
    const parseRes = parsePlainText(text);
    if (docResult.messages && docResult.messages.length > 0) {
      docResult.messages.forEach((m: { message: string }) => parseRes.errors.push(`DOCX Info: ${m.message}`));
    }
    return parseRes;
  } catch (err: any) {
    return {
      questions: [],
      errors: [`Failed to read DOCX file: ${err.message || 'Unknown error'}`]
    };
  }
}
