const descriptions: Record<string, string> = {
  'plan-free': 'สำหรับเริ่มทดลองใช้งาน',
  'plan-mini': 'สำหรับทีมขนาดเล็ก',
  'plan-starter': 'สำหรับธุรกิจขนาดเล็ก',
  'plan-basic': 'สำหรับการใช้งานประจำวัน',
  'plan-standard': 'สำหรับธุรกิจที่กำลังเติบโต',
  'plan-pro': 'สำหรับธุรกิจที่ใช้งานจำนวนมาก',
  'plan-business': 'สำหรับธุรกิจขนาดใหญ่',
};

export function planDescription(id: string, fallback: string): string {
  return descriptions[id] ?? fallback;
}
