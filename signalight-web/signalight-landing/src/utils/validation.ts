/**
 * Input Validation Utilities
 * 입력 값 검증 함수들
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// 이메일 검증
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 비밀번호 검증
export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = []

  if (password.length < 8) {
    errors.push({
      field: "password",
      message: "비밀번호는 최소 8자 이상이어야 합니다",
    })
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: "password",
      message: "비밀번호는 대문자를 포함해야 합니다",
    })
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      field: "password",
      message: "비밀번호는 소문자를 포함해야 합니다",
    })
  }

  if (!/[0-9]/.test(password)) {
    errors.push({
      field: "password",
      message: "비밀번호는 숫자를 포함해야 합니다",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 숫자 검증
export function validateNumber(value: string | number, min?: number, max?: number): ValidationResult {
  const errors: ValidationError[] = []
  const num = typeof value === "string" ? parseFloat(value) : value

  if (isNaN(num)) {
    errors.push({
      field: "number",
      message: "유효한 숫자를 입력하세요",
    })
    return { valid: false, errors }
  }

  if (min !== undefined && num < min) {
    errors.push({
      field: "number",
      message: `${min} 이상의 숫자를 입력하세요`,
    })
  }

  if (max !== undefined && num > max) {
    errors.push({
      field: "number",
      message: `${max} 이하의 숫자를 입력하세요`,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 가격 검증 (양수, 최대 2자리)
export function validatePrice(price: string | number): ValidationResult {
  const errors: ValidationError[] = []
  const num = typeof price === "string" ? parseFloat(price) : price

  if (isNaN(num)) {
    errors.push({
      field: "price",
      message: "유효한 가격을 입력하세요",
    })
    return { valid: false, errors }
  }

  if (num <= 0) {
    errors.push({
      field: "price",
      message: "가격은 0보다 커야 합니다",
    })
  }

  if (!Number.isInteger(num * 100)) {
    errors.push({
      field: "price",
      message: "가격은 최대 소수점 2자리까지 입력 가능합니다",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 수량 검증 (정수, 양수)
export function validateQuantity(quantity: string | number): ValidationResult {
  const errors: ValidationError[] = []
  const num = typeof quantity === "string" ? parseInt(quantity) : quantity

  if (isNaN(num)) {
    errors.push({
      field: "quantity",
      message: "유효한 수량을 입력하세요",
    })
    return { valid: false, errors }
  }

  if (!Number.isInteger(num)) {
    errors.push({
      field: "quantity",
      message: "수량은 정수여야 합니다",
    })
  }

  if (num <= 0) {
    errors.push({
      field: "quantity",
      message: "수량은 0보다 커야 합니다",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 종목 심볼 검증
export function validateSymbol(symbol: string): ValidationResult {
  const errors: ValidationError[] = []
  const cleaned = symbol.trim().toUpperCase()

  if (!cleaned) {
    errors.push({
      field: "symbol",
      message: "종목 심볼을 입력하세요",
    })
    return { valid: false, errors }
  }

  if (!/^[A-Z0-9\-\.]{1,10}$/.test(cleaned)) {
    errors.push({
      field: "symbol",
      message: "유효한 종목 심볼을 입력하세요 (예: AAPL, BRK.B)",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 날짜 검증
export function validateDate(dateString: string): ValidationResult {
  const errors: ValidationError[] = []

  if (!dateString) {
    errors.push({
      field: "date",
      message: "날짜를 선택하세요",
    })
    return { valid: false, errors }
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    errors.push({
      field: "date",
      message: "유효한 날짜를 입력하세요",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 날짜 범위 검증
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  const errors: ValidationError[] = []

  const startVal = new Date(startDate)
  const endVal = new Date(endDate)

  if (isNaN(startVal.getTime())) {
    errors.push({
      field: "startDate",
      message: "유효한 시작 날짜를 입력하세요",
    })
  }

  if (isNaN(endVal.getTime())) {
    errors.push({
      field: "endDate",
      message: "유효한 종료 날짜를 입력하세요",
    })
  }

  if (startVal > endVal) {
    errors.push({
      field: "dateRange",
      message: "시작 날짜는 종료 날짜보다 빨라야 합니다",
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 필수 필드 검증
export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: ValidationError[] = []

  if (value === null || value === undefined || value === "") {
    errors.push({
      field: fieldName,
      message: `${fieldName}은(는) 필수입니다`,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 폼 전체 검증
export interface FormData {
  [key: string]: any
}

export interface FormValidationRules {
  [key: string]: (value: any) => ValidationResult
}

export function validateForm(data: FormData, rules: FormValidationRules): ValidationResult {
  const allErrors: ValidationError[] = []

  Object.entries(rules).forEach(([field, validator]) => {
    const result = validator(data[field])
    if (!result.valid) {
      allErrors.push(...result.errors)
    }
  })

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  }
}

// API 에러 메시지 추출
export function getErrorMessage(error: any): string {
  if (typeof error === "string") return error

  if (error?.response?.data?.detail) {
    return error.response.data.detail
  }

  if (error?.response?.data?.message) {
    return error.response.data.message
  }

  if (error?.message) {
    return error.message
  }

  return "알 수 없는 오류가 발생했습니다"
}
