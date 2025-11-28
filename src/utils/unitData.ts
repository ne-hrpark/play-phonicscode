import * as XLSX from 'xlsx';

// 유닛 데이터 타입 정의
export type UnitData = {
  level: number; // 레벨 (book_seq)
  unit: number; // 유닛 번호
  unitName: string; // 유닛명
};

let unitDataCache: UnitData[] | null = null;

// 엑셀 파일에서 유닛 데이터 로드
export async function loadUnitDataFromExcel(filePath: string): Promise<UnitData[]> {
  if (unitDataCache) {
    return unitDataCache;
  }

  try {
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const unitData: UnitData[] = jsonData
      .map((row: any) => {
        // 테스트/설명 행 필터링 (모든 필드가 문자열이고 숫자로 변환 불가능한 경우 제외)
        const levelStr = row.레벨 || row['레벨'] || row.level || row.book_seq || '';
        const unitStr = row.유닛 || row['유닛'] || row.unit || '';
        const unitName = row.유닛명 || row['유닛명'] || row.unitName || row['유닛 이름'] || row['Unit Name'] || '';
        
        // 테스트/설명 행 체크: "TESTTESTTEST" 또는 "해당 행은 절대 삭제" 같은 텍스트가 포함된 행 제외
        const allValues = Object.values(row).join('').toString().toUpperCase();
        if (allValues.includes('TESTTESTTEST') || 
            allValues.includes('해당 행은 절대 삭제') ||
            allValues.includes('대화 형식 데이터')) {
          return null;
        }
        
        // 숫자로 변환 시도
        const level = parseInt(levelStr.toString(), 10);
        const unit = parseInt(unitStr.toString(), 10);
        
        // 필수 필드 확인 및 유효성 검사
        if (isNaN(level) || isNaN(unit) || !unitName || level <= 0 || unit <= 0) {
          return null;
        }
        
        return {
          level,
          unit,
          unitName: unitName.toString().trim(),
        };
      })
      .filter((item): item is UnitData => item !== null);

    unitDataCache = unitData;
    return unitData;
  } catch (error) {
    console.error('유닛 데이터 로드 실패:', error);
    return [];
  }
}

// 특정 레벨의 유닛 목록 가져오기
export function getUnitsByLevel(data: UnitData[], level: number): UnitData[] {
  return data
    .filter((item) => item.level === level)
    .sort((a, b) => a.unit - b.unit); // 유닛 번호 순으로 정렬
}

