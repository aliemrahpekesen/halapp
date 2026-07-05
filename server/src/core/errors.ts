export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const badRequest = (m: string) => new AppError(400, m);
export const unauthorized = (m = 'Yetkisiz') => new AppError(401, m);
export const forbidden = (m = 'Bu işlem için yetkiniz yok') => new AppError(403, m);
export const notFound = (m = 'Kayıt bulunamadı') => new AppError(404, m);
export const tooMany = (m = 'Çok fazla istek') => new AppError(429, m);
