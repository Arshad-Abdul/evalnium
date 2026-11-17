import Papa from 'papaparse';
import * as mammoth from 'mammoth';
import type { ParsedQuestion, ParseResult } from '../types/quiz';

/**
 * Automatic Mojibake Repair Helper (Fixes garbled Hindi text from Excel ANSI/Windows-1252 export like "à¤ªà¥...")
 */
function fixMojibake(str: string): string {
  if (!str) return str;
  let clean = str;
  if (/[\u00C0-\u00FF]/.test(clean)) {
    try {
      const bytes = new Uint8Array([...clean].map(c => c.charCodeAt(0) & 0xFF));
      const decoder = new TextDecoder('utf-8');
      const repaired = decoder.decode(bytes);
      if (repaired && !repaired.includes('')) {
        clean = repaired;
      }
    } catch {
      // ignore if repair fails
    }
  }

  return clean
    .replace(/^\uFEFF/, '')
    .replace(/\uFEFF/g, '')
    .replace(/[\uFFFD\u25FF\u25FE]/g, ' ')
    .replace(/\uFFFD/g, ' ')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[ \t]+/g, ' ');
}

/**
 * Helper to strip leading option letter prefixes like "A) ", "B. ", "(C) " from option values.
 * Strictly preserves match-the-following pairing formats (e.g., "A-III, B-I, C-IV, D-II" or "A-1, B-2").
 */
export function cleanOptionText(text: string, expectedOptionId?: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // 1. If this option text is a match-the-following pairing pattern, NEVER strip anything!
  // e.g. "A-III, B-III, C-I, D-IV", "A-1, B-2, C-3, D-4", "A-(iv), B-(i)", "(a)-(iii), (b)-(i)"
  if (/[A-D]\s*[\-\–—\:\=→]\s*[IVX0-9a-z\(\)]+[\s\,]+[A-D]\s*[\-\–—\:\=→]/i.test(trimmed)) {
    return trimmed;
  }
  if (/\bB\s*[\-\–—\:\=→]/i.test(trimmed) && /\bC\s*[\-\–—\:\=→]/i.test(trimmed)) {
    return trimmed;
  }
  // If text starts with A-, B-, C-, D- followed by roman numeral or number, it's a pairing!
  if (/^[A-D]\s*[\-\–—\:\=→]\s*(?:[IVX]+|\d+|\([IVX0-9]+\))/i.test(trimmed)) {
    return trimmed;
  }

  // 2. If an expectedOptionId is passed (e.g. 'B', 'C', 'D'), only strip if it matches THAT option!
  // It makes no sense for Option B to strip "A-"!
  if (expectedOptionId) {
    const escaped = expectedOptionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^[\\(\\[]?\\s*${escaped}[\\.\\:\\)]\\s*`, 'i');
    return trimmed.replace(regex, '').trim();
  }

  // 3. General fallback: only strip standard option prefixes like "A. ", "A) ", "(A) ",
  // NOT hyphens "A-" which are overwhelmingly used in match pairings (e.g. A-I, A-IV)
  return trimmed.replace(/^[\(\[]?\s*[A-D1-4][\.\:\)]\s*/i, '').trim();
}

/**
 * Auto-heal options that lost their leading "A-" due to legacy parsing
 * e.g. "III, B-III, C-I, D-IV" -> "A-III, B-III, C-I, D-IV"
 */
export function healMatchOption(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (/^[IVX0-9a-z\(\)]+[\s\,]+B\s*[\-\–—\:\=→]/i.test(trimmed)) {
    return 'A-' + trimmed;
  }
  return text;
}

export interface MatchFollowingExtraction {
  isMatch: boolean;
  cleanStem: string;
  listI: string[];
  listII: string[];
}

/**
 * Automatically detects and extracts List I & List II items from match-the-following questions
 * Handles both:
 * 1. Interleaved table exports (A. Item A I. Item I B. Item B II. Item II ...)
 * 2. Sequential sections (List I: A. ... B. ... List II: I. ... II. ...)
 */
export function detectAndExtractMatchFollowing(rawText: string): MatchFollowingExtraction | null {
  if (!rawText) return null;
  const text = rawText.trim();

  // Pattern 1: Interleaved table export: A. [Item A] I. [Item I] B. [Item B] II. [Item II] ...
  const interleavedRegex = /(?:(?:^|\s)(?:A\.|\(A\)|1\.|\(1\))\s*)([\s\S]+?)\s*(?:(?:I\.|\(I\)|1\.|\(1\))\s*)([\s\S]+?)\s*(?:(?:B\.|\(B\)|2\.|\(2\))\s*)([\s\S]+?)\s*(?:(?:II\.|\(II\)|2\.|\(2\))\s*)([\s\S]+?)\s*(?:(?:C\.|\(C\)|3\.|\(3\))\s*)([\s\S]+?)\s*(?:(?:III\.|\(III\)|3\.|\(3\))\s*)([\s\S]+?)\s*(?:(?:D\.|\(D\)|4\.|\(4\))\s*)([\s\S]+?)\s*(?:(?:IV\.|\(IV\)|4\.|\(4\))\s*)([\s\S]+?)(?=(?:\s*(?:Choose the correct|Select the correct|Options?|Codes?:?|$)))/i;
  
  const m1 = text.match(interleavedRegex);
  if (m1) {
    const listI = [m1[1].trim(), m1[3].trim(), m1[5].trim(), m1[7].trim()];
    const listII = [m1[2].trim(), m1[4].trim(), m1[6].trim(), m1[8].trim()];

    const matchIndex = m1.index || 0;
    let cleanStem = text.substring(0, matchIndex).trim();
    cleanStem = cleanStem.replace(/List\s*I\s*(?:\([^\)]*\))?\s*List\s*II\s*(?:\([^\)]*\))?\s*$/i, '').trim();
    if (!cleanStem) cleanStem = 'Match the items of List I with List II:';

    return {
      isMatch: true,
      cleanStem,
      listI,
      listII,
    };
  }

  // Pattern 2: Sequential List I: A. ... B. ... C. ... D. ... List II: I. ... II. ... III. ... IV. ...
  const seqRegex = /(?:List\s*I|सूची\s*I|खण्ड\s*A)[\s\S]*?(?:(?:^|\s)(?:A\.|\(A\)|1\.|\(1\))\s*)([\s\S]+?)\s*(?:(?:B\.|\(B\)|2\.|\(2\))\s*)([\s\S]+?)\s*(?:(?:C\.|\(C\)|3\.|\(3\))\s*)([\s\S]+?)\s*(?:(?:D\.|\(D\)|4\.|\(4\))\s*)([\s\S]+?)\s*(?:List\s*II|सूची\s*II|खण्ड\s*B)[\s\S]*?(?:(?:^|\s)(?:I\.|\(I\)|1\.|\(1\))\s*)([\s\S]+?)\s*(?:(?:II\.|\(II\)|2\.|\(2\))\s*)([\s\S]+?)\s*(?:(?:III\.|\(III\)|3\.|\(3\))\s*)([\s\S]+?)\s*(?:(?:IV\.|\(IV\)|4\.|\(4\))\s*)([\s\S]+?)(?=(?:\s*(?:Choose the correct|Select the correct|Options?|Codes?:?|$)))/i;

  const m2 = text.match(seqRegex);
  if (m2) {
    const listI = [m2[1].trim(), m2[2].trim(), m2[3].trim(), m2[4].trim()];
    const listII = [m2[5].trim(), m2[6].trim(), m2[7].trim(), m2[8].trim()];

    const matchIndex = m2.index || 0;
    let cleanStem = text.substring(0, matchIndex).trim();
    cleanStem = cleanStem.replace(/List\s*I\s*(?:\([^\)]*\))?.*$/i, '').trim();
    if (!cleanStem) cleanStem = 'Match the items of List I with List II:';

    return {
      isMatch: true,
      cleanStem,
      listI,
      listII,
    };
  }

  return null;
}

export interface ComprehensionPassageExtraction {
  passage: string;
  question: string;
}

/**
 * Deduplicate repeated passage content (often happens when copied across PDF page boundaries e.g. "28 | Page")
 */
function deduplicatePassage(text: string): string {
  const halfLen = Math.floor(text.length / 2);
  for (let len = halfLen; len > 40; len--) {
    const chunk = text.substring(0, len).trim();
    const secondIndex = text.indexOf(chunk, len - 20);
    if (secondIndex !== -1 && secondIndex < len + 80) {
      return text.substring(0, secondIndex).trim();
    }
  }
  return text;
}

/**
 * Automatically detects Reading Comprehension passages and isolates the reading passage from the question prompt.
 * Handles UGC-NET, NTA, Bank PO, and CTET formats.
 */
export function extractComprehensionPassage(rawText: string): ComprehensionPassageExtraction | null {
  if (!rawText) return null;
  const text = rawText.trim();

  const compPrefixRegex = /^(?:Comprehension\s*:?\s*)?Read the (?:following )?passage (?:carefully )?and answer the question(?:s)?(?:\s*given below)?\s*:?\s*/i;
  const isComp = compPrefixRegex.test(text) || 
    /^(?:Directions?\s*:?\s*)?Read the (?:following )?passage/i.test(text) || 
    /^(?:गद्यांश|निर्देश)\s*:?\s*(?:निम्नलिखित\s*)?गद्यांश को पढ़कर/i.test(text) ||
    /\b(?:Comprehension\s*:?\s*)?Read the (?:following )?passage/i.test(text);

  if (!isComp) return null;

  let body = text.replace(compPrefixRegex, '').trim();
  // Strip PDF header/footer artifacts e.g. "28 | P age", "30 | Page", "Page 28 of 50"
  body = body.replace(/\b\d+\s*\|\s*P\s*age\b/gi, '')
             .replace(/\b\d+\s*\|\s*Page\b/gi, '')
             .replace(/\b\d+\s*I\s*P\s*age\b/gi, '')
             .replace(/\bPage\s*\d+\s*(?:of\s*\d+)?\b/gi, '')
             .trim();

  // Strip any internal repeated "Comprehension: Read the following passage..." headers
  body = body.replace(/(?:Comprehension\s*:?\s*)?Read the (?:following )?passage (?:carefully )?and answer the question(?:s)?(?:\s*given below)?\s*:?\s*/gi, ' ').trim();

  // Find question prompt at the end
  const qMarkIndex = body.lastIndexOf('?');
  if (qMarkIndex !== -1) {
    const textBeforeQ = body.substring(0, qMarkIndex);
    const match = textBeforeQ.match(/(?:(?<=[.!?])\s+|^)(What|Why|How|Which|Where|When|Who|Whom|Whose|According to|Based on|Considering|In the light of|The author|In the passage|Select the|Identify the|उपर्युक्त|गद्यांश के अनुसार|लेखक के अनुसार)[^.!?]*$/i);
    if (match && match.index !== undefined) {
      let passage = body.substring(0, match.index).trim();
      const question = body.substring(match.index).trim();
      passage = deduplicatePassage(passage);
      if (passage && question) {
        return { passage, question };
      }
    }
  }

  // Fallback if no question mark at end: split at last sentence if last sentence looks like a question starter
  const lastPeriodIndex = body.lastIndexOf('.');
  if (lastPeriodIndex !== -1 && lastPeriodIndex < body.length - 15) {
    const candidateQ = body.substring(lastPeriodIndex + 1).trim();
    if (/^(?:What|Why|How|Which|According|Based|Considering|Identify|Select)/i.test(candidateQ)) {
      let passage = body.substring(0, lastPeriodIndex + 1).trim();
      passage = deduplicatePassage(passage);
      return { passage, question: candidateQ };
    }
  }

  return null;
}

/**
 * Universal Smart Text Parser for Questions & Answers
 */
export function parsePlainText(text: string): ParseResult {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  
  if (!text || !text.trim()) {
    return { questions: [], rawText: text, errors: ['File or text is empty.'] };
  }

  // Repair any garbled text encoding first
  const cleanRawText = fixMojibake(text);

  // Normalize line endings
  const cleanText = cleanRawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
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

        const optText = cleanOptionText(fixMojibake(optMatch[2].trim().replace(/\n+/g, ' ')));
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
          options.push({ id: String.fromCharCode(optChar++), text: cleanOptionText(fixMojibake(lines[i])) });
        }
      }
    }

    questionText = fixMojibake(questionText.replace(/^[\#\*\s\d\.\:\)]+/, '').trim());
    
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

    const finalExplanation = fixMojibake(inlineExplanation || defaultExp);

    const isValid = Boolean(questionText && options.length >= 2);
    let validationError: string | undefined;

    if (!questionText) validationError = 'Missing question text';
    else if (options.length < 2) validationError = 'Fewer than 2 options found';

    // Auto-detect match-the-following lists if present
    const matchData = detectAndExtractMatchFollowing(questionText || questionEnglish || '');
    let effectiveQText = questionText;
    let effectiveQEng = questionEnglish;
    let qType: 'mcq' | 'multiple_select' | 'match_following' = 'mcq';
    let listI: string[] | undefined = undefined;
    let listII: string[] | undefined = undefined;

    if (matchData) {
      qType = 'match_following';
      effectiveQText = matchData.cleanStem;
      if (effectiveQEng) effectiveQEng = matchData.cleanStem;
      listI = matchData.listI;
      listII = matchData.listII;
    }

    // Auto-detect reading comprehension passage if present
    const compData = extractComprehensionPassage(effectiveQText || effectiveQEng || '');
    let passage: string | undefined = undefined;
    if (compData) {
      passage = compData.passage;
      effectiveQText = compData.question;
      if (effectiveQEng) effectiveQEng = compData.question;
    }

    if (questionText && (options.length >= 2 || isValid)) {
      questions.push({
        tempId: `parsed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        questionText: effectiveQText,
        questionEnglish: effectiveQEng,
        passage,
        questionHindi,
        questionType: qType,
        listI,
        listII,
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
 * CSV Parser using PapaParse — Exact Header Matching for Single & Bilingual Column Schemas
 */
const safePapaParse = (content: string, options: any) => {
  const parser = (Papa as any)?.default?.parse || Papa?.parse || (window as any)?.Papa?.parse;
  if (typeof parser !== 'function') {
    throw new Error('CSV Parser engine unavailable');
  }
  return parser(content, options);
};

export function parseCSV(csvContent: string): ParseResult {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  const cleanCSVContent = fixMojibake(csvContent).replace(/^\uFEFF/, '').replace(/\uFEFF/g, '');

  // Helper to safely fetch value by column header name
  const getValueByHeader = (row: Record<string, string>, candidateHeaders: string[]): string => {
    const normalizedCandidates = candidateHeaders.map(h => h.toLowerCase().replace(/[\uFEFF\s\_\-\.]/g, ''));
    for (const key of Object.keys(row)) {
      const trimmedKey = key.replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '').trim();
      // Skip PapaParse auto-renamed duplicate blank headers like "_1", "_2", "_3"
      if (!trimmedKey || /^_\d+$/.test(trimmedKey) || trimmedKey.startsWith('__parsed_extra')) continue;

      const normKey = trimmedKey.toLowerCase().replace(/[\uFEFF\s\_\-\.]/g, '');
      if (normalizedCandidates.includes(normKey)) {
        return fixMojibake((row[key] || '').trim());
      }
    }
    return '';
  };

  // PASS 1: Try Header-Based Parsing
  const parsedHeader = safePapaParse(cleanCSVContent, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: '',
    transformHeader: (h: string) => h.replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '').trim(),
  });

  if (parsedHeader.data && parsedHeader.data.length > 0) {
    parsedHeader.data.forEach((row: any, idx: number) => {
      const questionEnglish = getValueByHeader(row, ['question_english', 'questionenglish', 'english_question', 'english', 'eng_question', 'q_english']);
      const questionHindi = getValueByHeader(row, ['question_hindi', 'questionhindi', 'hindi_question', 'hindi', 'hin_question', 'q_hindi']);
      let questionText = getValueByHeader(row, [
        'question', 'question_text', 'questiontext', 'prompt', 'question_statement', 'questionstatement', 'statement', 'question_title', 'questiontitle', 'q_text', 'qtext', 'stem', 'problem', 'questions', 'mcq', 'item', 'query'
      ]);

      const optA = getValueByHeader(row, ['option_a', 'optiona', 'opta', 'option1', 'option_1', 'choice_a', 'choicea', 'choice1', 'opt1', 'ans_a', 'ansa', 'a']);
      const optB = getValueByHeader(row, ['option_b', 'optionb', 'optb', 'option2', 'option_2', 'choice_b', 'choiceb', 'choice2', 'opt2', 'ans_b', 'ansb', 'b']);
      const optC = getValueByHeader(row, ['option_c', 'optionc', 'optc', 'option3', 'option_3', 'choice_c', 'choicec', 'choice3', 'opt3', 'ans_c', 'ansc', 'c']);
      const optD = getValueByHeader(row, ['option_d', 'optiond', 'optd', 'option4', 'option_4', 'choice_d', 'choiced', 'choice4', 'opt4', 'ans_d', 'ansd', 'd']);

      // Positional Column Fallback if named headers missed (preserve cell positions)
      const rawCells = Object.values(row).map((v: any) => fixMojibake(String(v || '').trim()));
      const filledCells = rawCells.filter(Boolean);

      if (!questionText && filledCells.length >= 3) {
        if (/^\d+$/.test(filledCells[0]) && filledCells.length >= 4) {
          questionText = filledCells[1];
        } else {
          questionText = filledCells[0];
        }
      }

      if (questionEnglish && questionHindi) {
        questionText = `English: ${questionEnglish}\n\nहिन्दी: ${questionHindi}`;
      } else if (questionEnglish && !questionText) {
        questionText = questionEnglish;
      } else if (questionHindi && !questionText) {
        questionText = questionHindi;
      }

      let startOptIdx = 1;
      if (rawCells.length >= 5 && /^\d+$/.test(rawCells[0])) startOptIdx = 2;

      const finalOptA = optA || rawCells[startOptIdx] || (filledCells.length > startOptIdx ? filledCells[startOptIdx] : '');
      const finalOptB = optB || rawCells[startOptIdx + 1] || (filledCells.length > startOptIdx + 1 ? filledCells[startOptIdx + 1] : '');
      const finalOptC = optC || rawCells[startOptIdx + 2] || (filledCells.length > startOptIdx + 2 ? filledCells[startOptIdx + 2] : '');
      const finalOptD = optD || rawCells[startOptIdx + 3] || (filledCells.length > startOptIdx + 3 ? filledCells[startOptIdx + 3] : '');
      
      let answer = getValueByHeader(row, ['correct_answer', 'correctanswer', 'answer', 'correct_option', 'correctoption', 'key', 'ans', 'correct', 'correct_key', 'answer_key']).toUpperCase();
      if (answer.startsWith('OPTION ')) answer = answer.replace('OPTION ', '').trim();
      if (['1', '2', '3', '4'].includes(answer)) {
        answer = String.fromCharCode(64 + parseInt(answer, 10));
      }
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        answer = 'A';
      }

      const explanationEnglish = getValueByHeader(row, ['explanation_english', 'explanationenglish']);
      const explanationHindi = getValueByHeader(row, ['explanation_hindi', 'explanationhindi']);
      let explanation = getValueByHeader(row, ['explanation', 'exp', 'reason', 'rationale', 'solution', 'comment']);

      if (explanationEnglish && explanationHindi) {
        explanation = `English: ${explanationEnglish}\n\nहिन्दी: ${explanationHindi}`;
      } else if (explanationEnglish && !explanation) {
        explanation = explanationEnglish;
      } else if (explanationHindi && !explanation) {
        explanation = explanationHindi;
      }

      const options: { id: string; text: string }[] = [];
      if (finalOptA) options.push({ id: 'A', text: cleanOptionText(finalOptA, 'A') });
      if (finalOptB) options.push({ id: 'B', text: cleanOptionText(finalOptB, 'B') });
      if (finalOptC) options.push({ id: 'C', text: cleanOptionText(finalOptC, 'C') });
      if (finalOptD) options.push({ id: 'D', text: cleanOptionText(finalOptD, 'D') });

      const safeOptions = options.length >= 2 ? options : [
        { id: 'A', text: cleanOptionText(finalOptA, 'A') || 'Option A' },
        { id: 'B', text: cleanOptionText(finalOptB, 'B') || 'Option B' },
        { id: 'C', text: cleanOptionText(finalOptC, 'C') || 'Option C' },
        { id: 'D', text: cleanOptionText(finalOptD, 'D') || 'Option D' }
      ].filter(o => Boolean(o.text));

      const correctOpt = safeOptions.find(o => o.id === answer);
      const defaultExp = correctOpt
        ? `Option (${answer}): "${correctOpt.text}" is the correct answer.`
        : `Option (${answer}) is the correct answer.`;

      const finalExplanation = explanation || defaultExp;

      // Smart Auto-Detection for Match the Following Lists
      const matchData = detectAndExtractMatchFollowing(questionText || questionEnglish || '');
      let effectiveQuestionText = questionText;
      let effectiveQuestionEnglish = questionEnglish;
      let questionType: 'mcq' | 'multiple_select' | 'match_following' = 'mcq';
      let listI: string[] | undefined = undefined;
      let listII: string[] | undefined = undefined;

      if (matchData) {
        questionType = 'match_following';
        effectiveQuestionText = matchData.cleanStem;
        if (effectiveQuestionEnglish) effectiveQuestionEnglish = matchData.cleanStem;
        listI = matchData.listI;
        listII = matchData.listII;
      }

      // Smart Auto-Detection for Reading Comprehension Passage
      const compData = extractComprehensionPassage(effectiveQuestionText || effectiveQuestionEnglish || '');
      let passage: string | undefined = undefined;
      if (compData) {
        passage = compData.passage;
        effectiveQuestionText = compData.question;
        if (effectiveQuestionEnglish) effectiveQuestionEnglish = compData.question;
      }

      if (effectiveQuestionText || safeOptions.length >= 1) {
        questions.push({
          tempId: `csv_${idx}_${Date.now()}`,
          questionText: effectiveQuestionText || `Question ${idx + 1}`,
          passage,
          questionEnglish: effectiveQuestionEnglish || (effectiveQuestionText && !questionHindi ? effectiveQuestionText : undefined),
          questionHindi: questionHindi || undefined,
          questionType,
          listI,
          listII,
          options: safeOptions.length >= 2 ? safeOptions : [
            { id: 'A', text: 'Option A' },
            { id: 'B', text: 'Option B' }
          ],
          correctOptionId: answer,
          explanation: finalExplanation,
          isValid: true,
        });
      }
    });
  }

  // PASS 2: Positional Array Parsing Fallback (For Headerless CSVs)
  if (questions.length === 0) {
    const parsedRows = safePapaParse(cleanCSVContent, {
      header: false,
      skipEmptyLines: 'greedy',
      delimiter: '',
    });

    if (parsedRows.data && parsedRows.data.length > 0) {
      let startIndex = 0;
      // Skip header row if line 0 contains words like "Question" or "Option"
      const firstRowStr = (parsedRows.data[0] || []).join(' ').toLowerCase();
      if (firstRowStr.includes('question') || firstRowStr.includes('option') || firstRowStr.includes('answer')) {
        startIndex = 1;
      }

      for (let i = startIndex; i < parsedRows.data.length; i++) {
        const row = (parsedRows.data[i] as any[]).map((v: any) => fixMojibake(String(v || '').trim())).filter(Boolean);
        if (row.length < 3) continue;

        let qText = row[0];
        let optStart = 1;

        // If Col 0 is Question Number e.g. "1"
        if (/^\d+$/.test(row[0]) && row.length >= 4) {
          qText = row[1];
          optStart = 2;
        }

        const opts: { id: string; text: string }[] = [];
        let optLetter = 65; // 'A'
        for (let j = optStart; j < row.length && opts.length < 4; j++) {
          const val = row[j];
          // Check if last cell is single letter answer e.g. "A" or "1"
          if (j === row.length - 1 && /^[A-D1-4]$/i.test(val) && opts.length >= 2) {
            break;
          }
          const char = String.fromCharCode(optLetter++);
          opts.push({ id: char, text: cleanOptionText(val, char) });
        }

        let ansKey = 'A';
        const lastVal = row[row.length - 1]?.toUpperCase();
        if (lastVal && ['A', 'B', 'C', 'D'].includes(lastVal)) {
          ansKey = lastVal;
        } else if (lastVal && ['1', '2', '3', '4'].includes(lastVal)) {
          ansKey = String.fromCharCode(64 + parseInt(lastVal, 10));
        }

        // Auto-detect match-the-following lists if present
        const matchData = detectAndExtractMatchFollowing(qText);
        let effectiveQText = qText;
        let questionType: 'mcq' | 'multiple_select' | 'match_following' = 'mcq';
        let listI: string[] | undefined = undefined;
        let listII: string[] | undefined = undefined;

        if (matchData) {
          questionType = 'match_following';
          effectiveQText = matchData.cleanStem;
          listI = matchData.listI;
          listII = matchData.listII;
        }

        // Smart Auto-Detection for Reading Comprehension Passage
        const compData = extractComprehensionPassage(effectiveQText);
        let passage: string | undefined = undefined;
        if (compData) {
          passage = compData.passage;
          effectiveQText = compData.question;
        }

        if (effectiveQText && opts.length >= 2) {
          questions.push({
            tempId: `csv_pos_${i}_${Date.now()}`,
            questionText: effectiveQText,
            passage,
            questionType,
            listI,
            listII,
            options: opts,
            correctOptionId: ansKey,
            explanation: `Option (${ansKey}) is the correct answer.`,
            isValid: true,
          });
        }
      }
    }
  }

  // PASS 3: Ultimate Plain Text Fallback
  if (questions.length === 0) {
    const plainRes = parsePlainText(csvContent);
    if (plainRes.questions && plainRes.questions.length > 0) {
      return plainRes;
    }
  }

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
