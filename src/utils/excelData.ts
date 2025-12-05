import * as XLSX from 'xlsx';

// 퀴즈 데이터 타입 정의
export type QuizData = {
  level: number; // 레벨
  unit: number; // 유닛
  answer_phonetic: string; // 정답(음가)
  problem_number: number; // 문제번호
  word: string; // 단어
  slot_char_start: number; // 슬롯 문자 시작 위치 (1-based)
  slot_char_end: number; // 슬롯 문자 종료 위치 (1-based)
  color_display_start?: number; // 색상 표시 시작
  color_display_count?: number; // 색상 표시 개수
  correct_image_path: string; // 정답 이미지 경로
  shadow_image_path: string; // 그림자 이미지 경로
  correct_audio_path: string; // 정답 음원 경로
  target_phonetic: string; // 타겟음가
};

let quizDataCache: QuizData[] | null = null;

// 엑셀 파일에서 데이터 로드
export async function loadQuizDataFromExcel(filePath: string): Promise<QuizData[]> {
  if (quizDataCache) {
    return quizDataCache;
  }

  try {
    //console.log('엑셀 파일 fetch 시작:', filePath);
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    //console.log('엑셀 파일 fetch 성공, arrayBuffer 변환 중...');
    const arrayBuffer = await response.arrayBuffer();
    //console.log('arrayBuffer 크기:', arrayBuffer.byteLength);
    
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    //console.log('엑셀 파일 읽기 성공, 시트 목록:', workbook.SheetNames);
    
    // 첫 번째 시트 사용
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    //console.log('JSON 변환 성공, 데이터 개수:', jsonData.length);
    
    // 데이터 변환 (엑셀 컬럼명에 맞게 수정)
    const quizData: QuizData[] = jsonData.map((row: any) => {
      return {
        level: parseInt(row.레벨 || row['레벨'] || row.level || '1', 10),
        unit: parseInt(row.유닛 || row['유닛'] || row.unit || '1', 10),
        answer_phonetic: row['정답(음가)'] || row['정답(음가)'] || row.answer_phonetic || '',
        problem_number: parseInt(row.문제번호 || row['문제번호'] || row.problem_number || '1', 10),
        word: row.단어 || row['단어'] || row.word || '',
        slot_char_start: parseInt(row['슬롯 문자 시작'] || row['슬롯 문자 시작'] || row.slot_char_start || '1', 10),
        slot_char_end: parseInt(row['슬롯 문자 종료'] || row['슬롯 문자 종료'] || row.slot_char_end || '1', 10),
        color_display_start: row['색상 표시 시작'] || row['색상 표시 시작'] || row.color_display_start ? parseInt(row['색상 표시 시작'] || row['색상 표시 시작'] || row.color_display_start, 10) : undefined,
        color_display_count: row['색상 표시 개수'] || row['색상 표시 개수'] || row.color_display_count ? parseInt(row['색상 표시 개수'] || row['색상 표시 개수'] || row.color_display_count, 10) : undefined,
        correct_image_path: row['정답 이미지 경로'] || row['정답 이미지 경로'] || row.correct_image_path || '',
        shadow_image_path: row['그림자 이미지 경로'] || row['그림자 이미지 경로'] || row.shadow_image_path || '',
        correct_audio_path: row['정답 음원 경로'] || row['정답 음원 경로'] || row.correct_audio_path || '',
        target_phonetic: row.타겟음가 || row['타겟음가'] || row.target_phonetic || '',
      };
    }).filter((item) => {
      // 필수 필드가 있는 데이터만 필터링
      return item.word && item.correct_image_path && item.shadow_image_path;
    });

    console.log('데이터 변환 완료, 유효한 데이터 개수:', quizData.length);
    if (quizData.length > 0) {
      console.log('변환된 첫 번째 데이터:', quizData[0]);
    }

    quizDataCache = quizData;
    return quizData;
  } catch (error) {
    console.error('엑셀 파일 로드 실패:', error);
    return [];
  }
}

// 특정 퀴즈 데이터 찾기 (레벨, 유닛, 문제번호로 찾기)
export function findQuizData(
  data: QuizData[],
  level: string,
  unit: string,
  problemNumber: string
): QuizData | null {
  const levelNum = parseInt(level, 10);
  const unitNum = parseInt(unit, 10);
  const problemNum = parseInt(problemNumber, 10);

  return (
    data.find(
      (item) =>
        item.level === levelNum && item.unit === unitNum && item.problem_number === problemNum
    ) || null
  );
}

// 같은 레벨, 같은 유닛의 다른 문제들의 정답(음가) 목록 가져오기 (랜덤 보기 생성용)
export function getRandomOptions(
  data: QuizData[],
  currentLevel: number,
  currentUnit: number,
  currentAnswerPhonetic: string,
  count: number = 4
): string[] {
  // 후보 음가 수집을 위한 헬퍼
  const collectPhonetics = (items: QuizData[]) =>
    items
      .map((item) => item.answer_phonetic)
      .filter((phonetic) => phonetic && phonetic !== currentAnswerPhonetic);

  // 1) 기본: 같은 레벨, 같은 유닛에서 후보 수집
  const sameLevelUnit = data.filter(
    (item) => item.level === currentLevel && item.unit === currentUnit
  );
  let candidates = collectPhonetics(sameLevelUnit);

  // 2) 유닛 안에 다양한 음가가 거의 없으면 → 같은 레벨 전체에서 추가로 수집
  if (candidates.length < count) {
    const sameLevel = data.filter((item) => item.level === currentLevel);
    candidates = candidates.concat(collectPhonetics(sameLevel));
  }

  // 3) 그래도 부족하면 → 전체 데이터에서 추가로 수집
  if (candidates.length < count) {
    candidates = candidates.concat(collectPhonetics(data));
  }

  // 중복 제거
  const uniqueCandidates = Array.from(new Set(candidates));

  // 랜덤으로 섞기
  const shuffled = [...uniqueCandidates].sort(() => Math.random() - 0.5);

  // 필요한 개수만큼 선택 (후보가 모자라면 가능한 만큼만 사용 후, 남은 개수는 반복 채우기)
  const selected: string[] = [];
  if (shuffled.length > 0) {
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selected.push(shuffled[i]);
    }
    while (selected.length < count) {
      selected.push(shuffled[selected.length % shuffled.length]);
    }
  }

  return selected;
}

// 전체 퀴즈 데이터에서 마지막 unit와 problem_number 찾기
export function getLastSequences(data: QuizData[], level: string): {
  lastUnit: number;
  lastProblemNumber: number;
} {
  const levelNum = parseInt(level, 10);
  const levelData = data.filter((item) => item.level === levelNum);

  if (levelData.length === 0) {
    return { lastUnit: 1, lastProblemNumber: 1 };
  }

  const lastUnit = Math.max(...levelData.map((item) => item.unit));
  const lastUnitData = levelData.filter((item) => item.unit === lastUnit);
  const lastProblemNumber = Math.max(...lastUnitData.map((item) => item.problem_number));

  return { lastUnit, lastProblemNumber };
}

// 특정 Unit의 마지막 problem_number 찾기
export function getLastProblemNumberForUnit(
  data: QuizData[],
  level: string,
  unit: string
): number {
  const levelNum = parseInt(level, 10);
  const unitNum = parseInt(unit, 10);
  const unitData = data.filter(
    (item) => item.level === levelNum && item.unit === unitNum
  );

  if (unitData.length === 0) {
    return 1;
  }

  return Math.max(...unitData.map((item) => item.problem_number));
}

