export type BlockType = 'title' | 'text'

export type Block = {
  id: string
  type: 'title' | 'text'
  content: string
}
