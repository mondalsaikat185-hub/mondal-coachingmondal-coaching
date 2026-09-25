// Time-of-day greeting (Indian time on the student's phone).
export function greetingFor(date = new Date()): { text: string; emoji: string; line: string } {
  const h = date.getHours();
  if (h >= 5 && h < 12) return { text: 'Good Morning', emoji: '☀️', line: 'নতুন দিন, নতুন পড়া — চলো শুরু করি!' };
  if (h >= 12 && h < 17) return { text: 'Good Afternoon', emoji: '🌤️', line: 'একটু পড়া, একটু প্র্যাকটিস — এগিয়ে থাকো।' };
  if (h >= 17 && h < 22) return { text: 'Good Evening', emoji: '🌆', line: 'আজকের পড়াটা একবার ঝালিয়ে নাও।' };
  return { text: 'Hello, Night Owl', emoji: '🌙', line: 'অনেক রাত হলো — পড়া শেষ করে ঠিক সময়ে ঘুমিয়ে পড়ো।' };
}
export function firstName(name?: string | null): string {
  const n = String(name || '').trim();
  return n ? n.split(/\s+/)[0] : 'Student';
}
