export type TokenType = 'name' | 'number' | 'string' | 'punct' | 'eof'

export interface Token {
    type: TokenType
    value: string
    number?: number
    line: number
    column: number
    start: number
    end: number
}

export class LuaSyntaxError extends Error {
    constructor(message: string, readonly line: number, readonly column: number) {
        super(message)
    }
}

const PUNCTUATION = [
    '...', '..', '::', '==', '~=', '<=', '>=', '//', '->',
    '{', '}', '[', ']', '(', ')', '=', ',', ';', '.', ':', '+', '-', '*', '/', '%', '^', '#', '<', '>', '|', '&', '?',
]

const SIMPLE_ESCAPES: Record<string, string> = {
    n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', "'": "'", '\n': '\n',
}

export function tokenize(text: string): Token[] {
    const tokens: Token[] = []
    let pos = 0
    let line = 1
    let lineStart = 0

    const fail = (message: string, at = pos): never => {
        throw new LuaSyntaxError(message, line, at - lineStart + 1)
    }

    const advanceNewlines = (from: number, to: number) => {
        for (let i = from; i < to; i++) {
            if (text[i] === '\n') {
                line++
                lineStart = i + 1
            }
        }
    }

    const longBracketLevel = (at: number): number => {
        if (text[at] !== '[') return -1
        let i = at + 1
        while (text[i] === '=') i++
        return text[i] === '[' ? i - at - 1 : -1
    }

    const readLongBracket = (at: number, level: number): { content: string; end: number } => {
        const open = at + level + 2
        const close = ']' + '='.repeat(level) + ']'
        const endIdx = text.indexOf(close, open)
        if (endIdx === -1) fail('Unfinished long bracket', at)
        let content = text.slice(open, endIdx)
        if (content.startsWith('\r\n')) content = content.slice(2)
        else if (content.startsWith('\n')) content = content.slice(1)
        return { content, end: endIdx + close.length }
    }

    const readQuoted = (quote: string): string => {
        let out = ''
        pos++
        while (true) {
            const ch = text[pos]
            if (ch === undefined || ch === '\n') fail('Unfinished string')
            if (ch === quote) {
                pos++
                return out
            }
            if (ch !== '\\') {
                out += ch
                pos++
                continue
            }
            const next = text[pos + 1]
            if (next === undefined) fail('Unfinished string')
            if (next in SIMPLE_ESCAPES) {
                out += SIMPLE_ESCAPES[next]
                if (next === '\n') {
                    line++
                    lineStart = pos + 2
                }
                pos += 2
            } else if (next === 'x') {
                const hex = text.slice(pos + 2, pos + 4)
                if (!/^[0-9a-fA-F]{2}$/.test(hex)) fail('Invalid \\x escape')
                out += String.fromCharCode(parseInt(hex, 16))
                pos += 4
            } else if (next === 'z') {
                pos += 2
                while (pos < text.length && /\s/.test(text[pos])) {
                    if (text[pos] === '\n') {
                        line++
                        lineStart = pos + 1
                    }
                    pos++
                }
            } else if (next === 'u') {
                const match = /^\{([0-9a-fA-F]+)\}/.exec(text.slice(pos + 2))
                if (!match) fail('Invalid \\u escape')
                out += String.fromCodePoint(parseInt(match![1], 16))
                pos += 2 + match![0].length
            } else if (/[0-9]/.test(next)) {
                const digits = /^[0-9]{1,3}/.exec(text.slice(pos + 1))![0]
                out += String.fromCharCode(parseInt(digits, 10))
                pos += 1 + digits.length
            } else {
                fail(`Invalid escape \\${next}`)
            }
        }
    }

    const readNumber = (): { raw: string; value: number } => {
        const rest = text.slice(pos)
        const hex = /^0[xX][0-9a-fA-F_]+/.exec(rest)
        if (hex) return { raw: hex[0], value: parseInt(hex[0].slice(2).replace(/_/g, ''), 16) }
        const bin = /^0[bB][01_]+/.exec(rest)
        if (bin) return { raw: bin[0], value: parseInt(bin[0].slice(2).replace(/_/g, ''), 2) }
        const dec = /^(?:[0-9][0-9_]*(?:\.[0-9_]*)?|\.[0-9][0-9_]*)(?:[eE][+-]?[0-9]+)?/.exec(rest)
        if (!dec) fail('Invalid number')
        return { raw: dec![0], value: Number(dec![0].replace(/_/g, '')) }
    }

    while (pos < text.length) {
        const ch = text[pos]

        if (ch === '\n') {
            pos++
            line++
            lineStart = pos
            continue
        }
        if (/\s/.test(ch)) {
            pos++
            continue
        }

        if (ch === '-' && text[pos + 1] === '-') {
            const level = longBracketLevel(pos + 2)
            if (level >= 0) {
                const { end } = readLongBracket(pos + 2, level)
                advanceNewlines(pos, end)
                pos = end
            } else {
                const nl = text.indexOf('\n', pos)
                pos = nl === -1 ? text.length : nl
            }
            continue
        }

        const start = pos
        const column = pos - lineStart + 1
        const startLine = line

        if (/[A-Za-z_]/.test(ch)) {
            const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(pos))![0]
            pos += name.length
            tokens.push({ type: 'name', value: name, line: startLine, column, start, end: pos })
            continue
        }

        if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(text[pos + 1] ?? ''))) {
            const { raw, value } = readNumber()
            pos += raw.length
            tokens.push({ type: 'number', value: raw, number: value, line: startLine, column, start, end: pos })
            continue
        }

        if (ch === '"' || ch === "'") {
            const value = readQuoted(ch)
            tokens.push({ type: 'string', value, line: startLine, column, start, end: pos })
            continue
        }

        if (ch === '`') fail('Interpolated strings are not supported')

        const level = longBracketLevel(pos)
        if (level >= 0) {
            const { content, end } = readLongBracket(pos, level)
            advanceNewlines(pos, end)
            pos = end
            tokens.push({ type: 'string', value: content, line: startLine, column, start, end: pos })
            continue
        }

        const punct = PUNCTUATION.find(p => text.startsWith(p, pos))
        if (!punct) fail(`Unexpected character '${ch}'`)
        pos += punct!.length
        tokens.push({ type: 'punct', value: punct!, line: startLine, column, start, end: pos })
    }

    tokens.push({ type: 'eof', value: '', line, column: pos - lineStart + 1, start: pos, end: pos })
    return tokens
}
