export type NotationField = 'weight' | 'reps' | 'sets' | 'rest' | 'effort'

export class NotationParseError extends Error {
  constructor(
    public field: NotationField,
    public input: string,
    public reason: string,
  ) {
    super(`Invalid ${field}: ${reason}`)
    this.name = 'NotationParseError'
  }
}
