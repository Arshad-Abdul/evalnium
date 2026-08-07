import type { Quiz } from '../types/quiz';

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-lis-epistemology',
    title: 'Unit 1 & 2: Epistemological Development & Bibliometric Laws',
    description: 'Master LIS Metrics history (Bibliometrics, Librametry, Scientometrics, Informetrics, Webometrics, Altmetrics) and foundational laws (Lotka, Bradford, Zipf, Price).',
    topic: 'Library & Information Science',
    category: 'Bibliometrics & Metric Sciences',
    difficulty: 'Hard',
    timeLimitMinutes: 15,
    passingPercentage: 60,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Admin Portal',
    questions: [
      {
        id: 'lis-ep-q1',
        questionText: `English: Who coined the term 'Bibliometrics' in his seminal 1969 paper, officially replacing E. Wyndham Hulme's older term 'Statistical Bibliography'?\n\nहिन्दी: 1969 में अपने प्रसिद्ध शोध पत्र में 'बिब्लियोमेट्रिक्स' शब्द का प्रतिपादन किसने किया था, जिससे आधिकारिक रूप से ई. विन्धम ह्यूम के पुराने शब्द 'स्टैटिस्टिकल बिब्लियोग्राफी' (सांख्यिकीय ग्रंथ सूची) को बदल दिया गया?`,
        options: [
          { id: 'A', text: 'Paul Otlet (पॉल ओटलेट)' },
          { id: 'B', text: 'Alan Pritchard (एलन प्रिचर्ड)' },
          { id: 'C', text: 'S.R. Ranganathan (एस.आर. रंगनाथन)' },
          { id: 'D', text: 'Vassily Nalimov (वसीली नलीमोव)' }
        ],
        correctOptionId: 'B',
        explanation: 'Alan Pritchard coined the term "Bibliometrics" in 1969 in his publication "Statistical Bibliography or Bibliometrics?", replacing Wyndham Hulme’s 1923 term.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q2',
        questionText: `English: Paul Otlet first utilized the French equivalent term 'bibliométrie' in which of his landmark publications in 1934?\n\nहिन्दी: पॉल ओटलेट ने 1934 में अपने किस मील के पत्थर प्रकाशन में पहली बार फ्रेंच समकक्ष शब्द 'bibliométrie' का उपयोग किया था?`,
        options: [
          { id: 'A', text: 'Traité de Documentation (ट्रेट डी डॉक्यूमेंटेशन)' },
          { id: 'B', text: 'Classification Décimale Universelle (यूनिवर्सल डेसिमल क्लासिफिकेशन)' },
          { id: 'C', text: 'Manuel de la Documentation (मैनुअल डी ला डॉक्यूमेंटेशन)' },
          { id: 'D', text: 'Sciences de l\'information (साइंस डे एल\'इन्फॉर्मेशन)' }
        ],
        correctOptionId: 'A',
        explanation: 'Paul Otlet first used the French term "bibliométrie" in 1934 in his classic work Traité de Documentation.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q3',
        questionText: `English: At which historic conference in 1948 did Dr. S.R. Ranganathan formally propose the term 'Librametry'?\n\nहिन्दी: 1948 में किस ऐतिहासिक सम्मेलन में डॉ. एस.आर. रंगनाथन ने औपचारिक रूप से 'लाइब्रामेट्री' शब्द का प्रस्ताव रखा था?`,
        options: [
          { id: 'A', text: 'IFLA Annual Conference in Paris (आईएफएलए वार्षिक सम्मेलन, पेरिस)' },
          { id: 'B', text: 'ASLIB Conference in Lamington Spa (एस्लिब सम्मेलन, लेमिंगटन स्पा)' },
          { id: 'C', text: 'Madras Library Association Council (मद्रास लाइब्रेरी एसोसिएशन काउंसिल)' },
          { id: 'D', text: 'Indian Library Association Annual Meet (भारतीय पुस्तकालय संघ वार्षिक बैठक)' }
        ],
        correctOptionId: 'B',
        explanation: 'Dr. S.R. Ranganathan introduced the term "Librametry" at the ASLIB (Association of Special Libraries and Information Bureaux) conference in Lamington Spa, UK, in 1948.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q4',
        questionText: `English: Dr. S.R. Ranganathan started practicing the quantitative methods of Librametry at Madras University from which year?\n\nहिन्दी: डॉ. एस.आर. रंगनाथन ने मद्रास विश्वविद्यालय में किस वर्ष से लाइब्रामेट्री की मात्रात्मक विधियों का व्यावहारिक अभ्यास शुरू कर दिया था?`,
        options: [
          { id: 'A', text: '1925' },
          { id: 'B', text: '1933' },
          { id: 'C', text: '1948' },
          { id: 'D', text: '1957' }
        ],
        correctOptionId: 'A',
        explanation: 'Dr. S.R. Ranganathan started applying statistical & quantitative techniques (Librametry) at Madras University Library as early as 1925.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q5',
        questionText: `English: Who coined the Russian term 'naukometriya' (Scientometrics) in 1969, defined as studying science as an organic information process?\n\nहिन्दी: 1969 में रूसी शब्द 'naukometriya' (साइंटोमेट्रिक्स) का प्रतिपादन किसने किया था, जिसे विज्ञान के एक जैविक सूचना प्रक्रिया के रूप में अध्ययन के रूप में परिभाषित किया गया है?`,
        options: [
          { id: 'A', text: 'Vassily V. Nalimov and Z.M. Mulchenko (वसीली वी. नलीमोव और जेड.एम. मुलचेंको)' },
          { id: 'B', text: 'Tibor Braun and Irina Marshakova (तिबोर ब्रॉन और इरीना मार्शकोवा)' },
          { id: 'C', text: 'Derek John de Solla Price (डेरेक जॉन डी सोला प्राइस)' },
          { id: 'D', text: 'Eugene Garfield and Alexander Pudovkin (यूजिन गारफील्ड और अलेक्जेंडर पुडोवकिन)' }
        ],
        correctOptionId: 'A',
        explanation: 'Vassily V. Nalimov and Z.M. Mulchenko originated the Russian term "Naukometriya" in 1969 in their book Naukometriya: Izuchenie Razvitiya Nauki kak Informatsionnogo Protsessa.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q6',
        questionText: `English: The academic domain of 'Scientometrics' achieved international recognition and institutionalization through which Hungarian journal established in 1977-1978?\n\nहिन्दी: 'साइंटोमेट्रिक्स' के शैक्षणिक क्षेत्र को 1977-1978 में स्थापित किस हंगेरियन जर्नल के माध्यम से अंतरराष्ट्रीय स्तर पर पहचान और संस्थागत रूप मिला?`,
        options: [
          { id: 'A', text: 'Scientometrics (साइंटोमेट्रिक्स जर्नल)' },
          { id: 'B', text: 'Journal of Informetrics (जर्नल ऑफ इन्फोमेट्रिक्स)' },
          { id: 'C', text: 'Journal of LIS Metric Studies (जर्नल ऑफ एलआईएस मीट्रिक स्टडीज)' },
          { id: 'D', text: 'Hungarian Documentation (हंगेरियन प्रलेखन)' }
        ],
        correctOptionId: 'A',
        explanation: 'Tibor Braun established the journal "Scientometrics" in Hungary in 1978, institutionalizing the field internationally.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q7',
        questionText: `English: Who coined the German term 'informetrie' in 1979 to encompass quantitative analyses of information flows beyond books and formal scientific documents?\n\nहिन्दी: 1979 में जर्मन शब्द 'informetrie' (इन्फोमेट्रिक्स) का प्रतिपादन किसने किया था, ताकि मुद्रित पुस्तकों और औपचारिक वैज्ञानिक दस्तावेजों से परे सूचना प्रवाह के मात्रात्मक विश्लेषण को शामिल किया जा सके?`,
        options: [
          { id: 'A', text: 'Jean Tague-Sutcliffe (जीन टैग-सटक्लिफ)' },
          { id: 'B', text: 'Otto Nacke (ऑटो नाके)' },
          { id: 'C', text: 'Leo Egghe (लियो एग)' },
          { id: 'D', text: 'S.R. Ranganathan (एस.आर. रंगनाथन)' }
        ],
        correctOptionId: 'B',
        explanation: 'Otto Nacke proposed the German term "Informetrie" in 1979 to broaden bibliometrics to all non-book information fields.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q8',
        questionText: `English: Which landmark publication by Leo Egghe and Ronald Rousseau in 1990 consolidated Informetrics into a rigorous mathematical LIS discipline?\n\nहिन्दी: 1990 में लियो एग और रोनाल्ड रूसो के किस ऐतिहासिक प्रकाशन ने इन्फोमेट्रिक्स को एक कठोर गणितीय एलआईएस (LIS) अनुशासन के रूप में सुदृढ़ किया?`,
        options: [
          { id: 'A', text: 'Introduction to Informetrics (इन्ट्रोडक्शन टू इन्फोमेट्रिक्स)' },
          { id: 'B', text: 'Elements of Bibliometrics (एलीमेंट्स ऑफ बिब्लियोमेट्रिक्स)' },
          { id: 'C', text: 'Informetrie Und Bibliometrie (इन्फोमेट्री उंड बिब्लियोमेट्री)' },
          { id: 'D', text: 'Foundations of Metric Science (फाउंडेशन ऑफ मीट्रिक साइंस)' }
        ],
        correctOptionId: 'A',
        explanation: 'Leo Egghe and Ronald Rousseau published "Introduction to Informetrics: Quantitative Methods in Library, Documentation and Information Science" in 1990.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q9',
        questionText: `English: The term 'Webometrics' was first coined in 1997 by which of the following LIS scholars?\n\nहिन्दी: 1997 में निम्नलिखित में से किस एलआईएस (LIS) विद्वान द्वारा पहली बार 'वेबोमेट्रिक्स' शब्द का प्रतिपादन किया गया था?`,
        options: [
          { id: 'A', text: 'Peter Ingwersen and Tomas C. Almind (पीटर इंग्वरसेन और थॉमस सी. अल्माइंड)' },
          { id: 'B', text: 'Mike Thelwall and David Wilkinson (माइक थेलवाल और डेविड विल्किंसन)' },
          { id: 'C', text: 'Ronald Rousseau and Leo Egghe (रोनाल्ड रूसो और लियो एग)' },
          { id: 'D', text: 'Lennart Björneborn (लेनार्ट ब्योर्नबोर्न)' }
        ],
        correctOptionId: 'A',
        explanation: 'Tomas C. Almind and Peter Ingwersen introduced "Webometrics" in their 1997 paper "Informetric analyses on the World Wide Web".',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q10',
        questionText: `English: What is the primary difference between 'Webometrics' and 'Cybermetrics'?\n\nहिन्दी: 'वेबोमेट्रिक्स' और 'साइबरमेट्रिक्स' के बीच प्राथमिक अंतर क्या है?`,
        options: [
          { id: 'A', text: 'Cybermetrics covers the entire Internet infrastructure (emails, servers, protocols); Webometrics is restricted to WWW structures (साइबरमेट्रिक्स संपूर्ण इंटरनेट बुनियादी ढांचे को कवर करता है; वेबोमेट्रिक्स केवल WWW संरचनाओं तक सीमित है)' },
          { id: 'B', text: 'Webometrics is qualitative; Cybermetrics is strictly quantitative (वेबोमेट्रिक्स गुणात्मक है; साइबरमेट्रिक्स पूरी तरह से मात्रात्मक है)' },
          { id: 'C', text: 'Webometrics is a subfield of Altmetrics; Cybermetrics is a subfield of Bibliometrics (वेबोमेट्रिक्स ऑल्टमेट्रिक्स का एक उपक्षेत्र है; साइबरमेट्रिक्स बिब्लियोमेट्रिक्स का एक उपक्षेत्र है)' },
          { id: 'D', text: 'There is no structural difference; they are perfect synonyms (दोनों में कोई संरचनात्मक अंतर नहीं है; वे पूर्णतः पर्यायवाची हैं)' }
        ],
        correctOptionId: 'A',
        explanation: 'Cybermetrics encompasses all internet-based communication forms (Usenet, FTP, Gopher, email, Web), whereas Webometrics specifically targets World Wide Web resources.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q11',
        questionText: `English: Who coined the term 'altmetrics' in 2010 to represent real-time article-level web mentions?\n\nहिन्दी: वास्तविक समय के लेख-स्तरीय वेब उल्लेखों का प्रतिनिधित्व करने के लिए 2010 में 'ऑल्टमेट्रिक्स' शब्द का प्रतिपादन किसने किया था?`,
        options: [
          { id: 'A', text: 'Jason Priem (जेसन प्रियम)' },
          { id: 'B', text: 'Heather Piwowar (हीथर पिवोवार)' },
          { id: 'C', text: 'Eugene Garfield (यूजिन गारफील्ड)' },
          { id: 'D', text: 'Peter Ingwersen (पीटर इंग्वरसेन)' }
        ],
        correctOptionId: 'A',
        explanation: 'Jason Priem coined the term "altmetrics" in September 2010 in a tweet and co-authored the Altmetrics Manifesto.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q12',
        questionText: `English: Who coined 'Statistical Bibliography' in 1923, which was the direct predecessor to modern Bibliometrics?\n\nहिन्दी: 1923 में 'स्टैटिस्टिकल बिब्लियोग्राफी' (सांख्यिकीय ग्रंथ सूची) शब्द का प्रतिपादन किसने किया था, जो आधुनिक बिब्लियोमेट्रिक्स का प्रत्यक्ष अग्रदूत था?`,
        options: [
          { id: 'A', text: 'Paul Otlet (पॉल ओटलेट)' },
          { id: 'B', text: 'E. Wyndham Hulme (ई. विन्धम ह्यूम)' },
          { id: 'C', text: 'Alan Pritchard (एलन प्रिचर्ड)' },
          { id: 'D', text: 'S.R. Ranganathan (एस.आर. रंगनाथन)' }
        ],
        correctOptionId: 'B',
        explanation: 'E. Wyndham Hulme introduced the term "Statistical Bibliography" in 1923 during his lectures at Cambridge University.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q13',
        questionText: `English: The International Society for Scientometrics and Informetrics (ISSI) was officially founded in which year?\n\nहिन्दी: इंटरनेशनल सोसाइटी फॉर साइंटोमेट्रिक्स एंड इन्फोमेट्रिक्स (ISSI) की आधिकारिक स्थापना किस वर्ष की गई थी?`,
        options: [
          { id: 'A', text: '1979' },
          { id: 'B', text: '1990' },
          { id: 'C', text: '1993' },
          { id: 'D', text: '1997' }
        ],
        correctOptionId: 'C',
        explanation: 'ISSI (International Society for Scientometrics and Informetrics) was formally incorporated in 1993 at the International Conference on Scientometrics and Informetrics in Berlin.',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q14',
        questionText: `English: Which of the following describes the correct ascending chronological sequence of LIS metric terms?\n\nहिन्दी: निम्नलिखित में से कौन एलआईएस (LIS) मीट्रिक शब्दों के सही आरोही कालानुक्रमिक क्रम का वर्णन करता है?`,
        options: [
          { id: 'A', text: 'Statistical Bibliography -> Librametrics -> Bibliometrics -> Informetrics -> Webometrics -> Altmetrics' },
          { id: 'B', text: 'Librametrics -> Statistical Bibliography -> Bibliometrics -> Webometrics -> Informetrics -> Altmetrics' },
          { id: 'C', text: 'Statistical Bibliography -> Bibliometrics -> Librametrics -> Informetrics -> Altmetrics -> Webometrics' },
          { id: 'D', text: 'Librametrics -> Bibliometrics -> Statistical Bibliography -> Informetrics -> Webometrics -> Altmetrics' }
        ],
        correctOptionId: 'A',
        explanation: 'Chronological timeline: Statistical Bibliography (1923) -> Librametrics (1925/1948) -> Bibliometrics (1969) -> Informetrics (1979) -> Webometrics (1997) -> Altmetrics (2010).',
        topic: 'Unit 1: Epistemological Development',
        marks: 1
      },
      {
        id: 'lis-ep-q15',
        questionText: `English: Alfred J. Lotka formulated his inverse-power law of scientific productivity in 1926 based on publication data from which indexing resource?\n\nहिन्दी: अल्फ्रेड जे. लॉटका ने 1926 में किस इंडेक्सिंग संसाधन के प्रकाशन डेटा के आधार पर वैज्ञानिक उत्पादकता के अपने प्रतिलोम-शक्ति नियम को प्रतिपादित किया था?`,
        options: [
          { id: 'A', text: 'Chemical Abstracts (केमिकल एब्स्ट्रेक्ट्स)' },
          { id: 'B', text: 'Science Citation Index (साइंस साइटेशन इंडेक्स)' },
          { id: 'C', text: 'Biological Abstracts (बायोलॉजिकल एब्स्ट्रेक्ट्स)' },
          { id: 'D', text: 'Web of Science (वेब ऑफ साइंस)' }
        ],
        correctOptionId: 'A',
        explanation: 'Alfred J. Lotka analyzed author contribution frequencies from Chemical Abstracts (1907–1916) and Auerbach’s Geschichtstafeln der Physik to formulate Lotka’s Law (x^n * y = C).',
        topic: 'Unit 2: Foundational Laws',
        marks: 1
      },
      {
        id: 'lis-ep-q16',
        questionText: `English: Samuel C. Bradford's Law of Scattering (1934) divides journals into three equal-yielding zones of articles. What mathematical progression describes the count of journals in these successive zones?\n\nहिन्दी: सैमुअल सी. ब्रैडफोर्ड का बिखराव का नियम (1934) पत्रिकाओं को लेखों के तीन समान-उत्पादक क्षेत्रों में विभाजित करता है। इन क्रमिक क्षेत्रों में पत्रिकाओं की संख्या का वर्णन कौन सी गणितीय श्रेणी करती है?`,
        options: [
          { id: 'A', text: 'Arithmetic progression (समांतर श्रेणी)' },
          { id: 'B', text: 'Geometric progression (गुणोत्तर श्रेणी)' },
          { id: 'C', text: 'Fibonacci sequence (फाइबोनैचि अनुक्रम)' },
          { id: 'D', text: 'Logarithmic sequence (लघुगणकीय श्रेणी)' }
        ],
        correctOptionId: 'B',
        explanation: 'Bradford’s Law states that journal counts across nucleus and successive zones of equal article yield follow a geometric progression 1 : n : n².',
        topic: 'Unit 2: Foundational Laws',
        marks: 1
      },
      {
        id: 'lis-ep-q17',
        questionText: `English: George Kingsley Zipf's Law of Word Frequency (1949) is mathematically modeled as which formula?\n\nहिन्दी: जॉर्ज किंग्सले जिप्स का वर्ड फ्रीक्वेंसी नियम (1949) गणितीय रूप से किस सूत्र पर आधारित है?`,
        options: [
          { id: 'A', text: 'a(n) = k/n^2' },
          { id: 'B', text: 'r * f = c' },
          { id: 'C', text: 'R(r) = a log r' },
          { id: 'D', text: 'C = sqrt(N)' }
        ],
        correctOptionId: 'B',
        explanation: 'Zipf’s Law states that the rank (r) of a word multiplied by its frequency (f) equals a constant (c): r × f = C.',
        topic: 'Unit 2: Foundational Laws',
        marks: 1
      },
      {
        id: 'lis-ep-q18',
        questionText: `English: On which of the following human cognitive behaviors did Zipf base his word distribution models?\n\nहिन्दी: जिप्स ने अपने शब्द वितरण मॉडल को निम्नलिखित में से किस मानव संज्ञानात्मक व्यवहार पर आधारित किया था?`,
        options: [
          { id: 'A', text: 'Principle of Maximum Entropy (अधिकतम एन्ट्रॉपी का सिद्धांत)' },
          { id: 'B', text: 'Principle of Least Effort (न्यूनतम प्रयास का सिद्धांत)' },
          { id: 'C', text: 'Cumulative Advantage Principle (संचयी लाभ का सिद्धांत)' },
          { id: 'D', text: 'Social Exchange Principle (सामाजिक विनिमय का सिद्धांत)' }
        ],
        correctOptionId: 'B',
        explanation: 'Zipf based his empirical word frequency distributions on the "Principle of Least Effort" (1949).',
        topic: 'Unit 2: Foundational Laws',
        marks: 1
      },
      {
        id: 'lis-ep-q19',
        questionText: `English: According to Derek Price's Square Root Law of Scientific Productivity, if a research field has a total of 144 active contributors, how many elite authors write exactly 50% of the total literature?\n\nहिन्दी: वैज्ञानिक उत्पादकता के डेरेक प्राइस के स्क्वायर रूट नियम के अनुसार, यदि किसी शोध क्षेत्र में कुल 144 सक्रिय योगदानकर्ता हैं, तो कितने विशिष्ट (elite) लेखक कुल साहित्य का ठीक 50% हिस्सा लिखते हैं?`,
        options: [
          { id: 'A', text: '72' },
          { id: 'B', text: '12' },
          { id: 'C', text: '36' },
          { id: 'D', text: '24' }
        ],
        correctOptionId: 'B',
        explanation: 'According to Derek Price’s Law, the square root of the total number of authors (√N) produce half (50%) of all papers. √144 = 12.',
        topic: 'Unit 2: Foundational Laws',
        marks: 1
      }
    ]
  },
  {
    id: 'quiz-lis-01',
    title: 'Library & Information Science Foundations',
    description: 'Test your knowledge on Library Classification, Cataloging, metadata standards, and five laws of library science.',
    topic: 'Library & Information Science',
    category: 'Information Science',
    difficulty: 'Medium',
    timeLimitMinutes: 10,
    passingPercentage: 60,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Admin Portal',
    questions: [
      {
        id: 'lis-q1',
        questionText: 'Who formulated the Five Laws of Library Science in India?',
        options: [
          { id: 'A', text: 'Melvil Dewey' },
          { id: 'B', text: 'Dr. S.R. Ranganathan' },
          { id: 'C', text: 'C.A. Cutter' },
          { id: 'D', text: 'Henri La Fontaine' }
        ],
        correctOptionId: 'B',
        explanation: 'Dr. S.R. Ranganathan formulated the Five Laws of Library Science in 1931, which form the cornerstone of library philosophy in India and worldwide.',
        topic: 'LIS Fundamentals',
        marks: 1
      },
      {
        id: 'lis-q2',
        questionText: 'What is the full form of MARC in library cataloging?',
        options: [
          { id: 'A', text: 'Machine-Readable Cataloging' },
          { id: 'B', text: 'Management Automated Resource Center' },
          { id: 'C', text: 'Microfilm Archival Reference Code' },
          { id: 'D', text: 'Multimedia Access & Research Catalog' }
        ],
        correctOptionId: 'A',
        explanation: 'MARC stands for Machine-Readable Cataloging, a digital standard for formatting bibliographical data.',
        topic: 'Cataloging',
        marks: 1
      },
      {
        id: 'lis-q3',
        questionText: 'In Colon Classification (CC), what does PMEST stand for?',
        options: [
          { id: 'A', text: 'Personality, Matter, Energy, Space, Time' },
          { id: 'B', text: 'Print, Media, Electronic, System, Text' },
          { id: 'C', text: 'Process, Method, Entity, Source, Topic' },
          { id: 'D', text: 'Primary, Main, Element, Secondary, Tertiary' }
        ],
        correctOptionId: 'A',
        explanation: 'PMEST is Ranganathan’s fundamental categories in Colon Classification: Personality, Matter, Energy, Space, and Time.',
        topic: 'Classification',
        marks: 1
      },
      {
        id: 'lis-q4',
        questionText: 'Which Dublin Core element contains the name of the entity primarily responsible for making the resource?',
        options: [
          { id: 'A', text: 'Publisher' },
          { id: 'B', text: 'Contributor' },
          { id: 'C', text: 'Creator' },
          { id: 'D', text: 'Rights' }
        ],
        correctOptionId: 'C',
        explanation: 'In the Dublin Core Metadata Element Set, "Creator" is the entity primarily responsible for making the content of the resource.',
        topic: 'Metadata',
        marks: 1
      },
      {
        id: 'lis-q5',
        questionText: 'What is the fifth law of library science?',
        options: [
          { id: 'A', text: 'Books are for use' },
          { id: 'B', text: 'Every reader his/her book' },
          { id: 'C', text: 'The library is a growing organism' },
          { id: 'D', text: 'Save the time of the reader' }
        ],
        correctOptionId: 'C',
        explanation: 'The Fifth Law states "The library is a growing organism", highlighting continuous adaptation in collection and technology.',
        topic: 'LIS Fundamentals',
        marks: 1
      }
    ]
  },
  {
    id: 'quiz-cs-01',
    title: 'Modern Web Development & React Essentials',
    description: 'Check your concepts on React 19, JavaScript ES6+, Vite, CSS Flexbox & Grid, and web fundamentals.',
    topic: 'Computer Science',
    category: 'Web Technology',
    difficulty: 'Easy',
    timeLimitMinutes: 8,
    passingPercentage: 70,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Admin Portal',
    questions: [
      {
        id: 'cs-q1',
        questionText: 'Which React hook is used to handle side effects such as fetching data or subscribing to events?',
        options: [
          { id: 'A', text: 'useState' },
          { id: 'B', text: 'useEffect' },
          { id: 'C', text: 'useContext' },
          { id: 'D', text: 'useReducer' }
        ],
        correctOptionId: 'B',
        explanation: 'useEffect allows developers to perform side effects in functional components.',
        topic: 'React',
        marks: 1
      },
      {
        id: 'cs-q2',
        questionText: 'Which CSS layout module allows one-dimensional layout control along rows or columns?',
        options: [
          { id: 'A', text: 'CSS Grid' },
          { id: 'B', text: 'Flexbox' },
          { id: 'C', text: 'Float' },
          { id: 'D', text: 'Absolute Positioning' }
        ],
        correctOptionId: 'B',
        explanation: 'Flexbox is designed for one-dimensional layouts, whereas CSS Grid is optimized for two-dimensional layouts.',
        topic: 'CSS',
        marks: 1
      },
      {
        id: 'cs-q3',
        questionText: 'What does JSON stand for?',
        options: [
          { id: 'A', text: 'Java Source Object Network' },
          { id: 'B', text: 'JavaScript Object Notation' },
          { id: 'C', text: 'JS Organized Node' },
          { id: 'D', text: 'Joined System Operating Format' }
        ],
        correctOptionId: 'B',
        explanation: 'JSON stands for JavaScript Object Notation, a lightweight text-based data format.',
        topic: 'Web Tech',
        marks: 1
      },
      {
        id: 'cs-q4',
        questionText: 'Which array method in JavaScript creates a new array populated with the results of calling a provided function on every element?',
        options: [
          { id: 'A', text: 'forEach()' },
          { id: 'B', text: 'map()' },
          { id: 'C', text: 'filter()' },
          { id: 'D', text: 'reduce()' }
        ],
        correctOptionId: 'B',
        explanation: '.map() creates a new array by applying a callback to each item, preserving the original array.',
        topic: 'JavaScript',
        marks: 1
      }
    ]
  },
  {
    id: 'quiz-aptitude-01',
    title: 'Logical Reasoning & General Aptitude',
    description: 'Practice speed and accuracy with series completion, coding-decoding, and quantitative problem solving.',
    topic: 'General Aptitude',
    category: 'Competitive Exams',
    difficulty: 'Hard',
    timeLimitMinutes: 5,
    passingPercentage: 50,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'Admin Portal',
    questions: [
      {
        id: 'apt-q1',
        questionText: 'Find the next number in the series: 2, 6, 12, 20, 30, ?',
        options: [
          { id: 'A', text: '36' },
          { id: 'B', text: '40' },
          { id: 'C', text: '42' },
          { id: 'D', text: '48' }
        ],
        correctOptionId: 'C',
        explanation: 'The differences between terms are +4, +6, +8, +10. Next difference is +12, so 30 + 12 = 42. (Alternatively n^2 + n for n=1,2,3,4,5,6 -> 6^2 + 6 = 42).',
        topic: 'Series Completion',
        marks: 1
      },
      {
        id: 'apt-q2',
        questionText: 'If CAT is coded as 24 and DOG is coded as 26, how is PIG coded?',
        options: [
          { id: 'A', text: '32' },
          { id: 'B', text: '31' },
          { id: 'C', text: '28' },
          { id: 'D', text: '36' }
        ],
        correctOptionId: 'A',
        explanation: 'Sum of alphabet position numbers: P(16) + I(9) + G(7) = 32.',
        topic: 'Coding-Decoding',
        marks: 1
      }
    ]
  }
];
