// 일부 개인정보 의심 패턴 검사
export function containsPersonalInfo(text) {

  const patterns = [

    // 주민등록번호 형태
    /\d{6}[-\s]?\d{7}/,

    // 휴대전화번호 형태
    /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/,

    // 이메일 주소 형태
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  ];

  return patterns.some(pattern =>
    pattern.test(text)
  );
}
