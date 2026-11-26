export const offer = {
  course: 305734,
  title: 'Go-шечка Pro MAX',
  url: 'https://stepik.org/a/305734',
  cover: '../../../assets/course-covers/305734.png',
  headline: 'От первой программы до своего приложения.',
  description: 'Go, Vue, PostgreSQL, Git и Docker. Соберём сервис доставки с каталогом, корзиной и заказами.',
};

// Codes supplied by the author on 2026-11-26. This preview never changes coupons.
export const variants = {
  general: {discount: 10, code: 'GOSHECHKAMAX'},
  go: {discount: 20, code: 'GOSHECHKAMAX20'},
};

export function variantForCourse(course) {
  return [305666, 300562].includes(Number(course)) ? 'go' : 'general';
}
