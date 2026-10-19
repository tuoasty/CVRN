import type { LuaField, LuaParseError, LuaStatement, LuaTable, LuaValue } from '../../types/luaValue'
import { LuaSyntaxError, tokenize, type Token } from './tokenize'

export type ParseLuaResult =
    | { ok: true; value: LuaStatement[] }
    | { ok: false; error: LuaParseError }

const BINARY_PRIORITY: Record<string, { left: number; right: number }> = {
    '..': { left: 9, right: 8 },
    '+': { left: 10, right: 10 },
    '-': { left: 10, right: 10 },
    '*': { left: 11, right: 11 },
    '/': { left: 11, right: 11 },
    '//': { left: 11, right: 11 },
    '%': { left: 11, right: 11 },
    '^': { left: 14, right: 13 },
}

const UNARY_PRIORITY = 12

const UNSUPPORTED_KEYWORDS = new Set([
    'function', 'if', 'for', 'while', 'repeat', 'do', 'goto', 'break', 'continue', 'export', 'type',
])

export function parseLuaData(text: string): ParseLuaResult {
    try {
        return { ok: true, value: new Parser(text, tokenize(text)).parseChunk() }
    } catch (e) {
        if (e instanceof LuaSyntaxError) {
            const lineText = text.split(/\r?\n/)[e.line - 1] ?? ''
            return { ok: false, error: { message: e.message, line: e.line, column: e.column, lineText } }
        }
        throw e
    }
}

class Parser {
    private index = 0

    constructor(private readonly text: string, private readonly tokens: Token[]) {}

    parseChunk(): LuaStatement[] {
        const statements: LuaStatement[] = []
        while (!this.atEof()) {
            if (this.acceptPunct(';')) continue
            const statement = this.parseStatement()
            if (statement) statements.push(statement)
        }
        return statements
    }

    private parseStatement(): LuaStatement | null {
        const first = this.peek()

        if (this.isName('return')) {
            this.next()
            if (!this.atEof() && !this.isPunct(';')) this.parseExpression()
            return null
        }

        if (first.type === 'name' && UNSUPPORTED_KEYWORDS.has(first.value)) {
            this.fail(`'${first.value}' statements are not supported, paste only data tables`, first)
        }

        let target: string
        if (this.isName('local')) {
            this.next()
            target = this.expectName().value
            if (this.acceptPunct(':')) this.skipType()
        } else {
            target = this.parseTarget()
        }

        this.expectPunct('=')
        const value = this.parseExpression()
        const last = this.tokens[this.index - 1]

        return {
            target,
            value,
            line: first.line,
            source: this.text.slice(first.start, last.end),
        }
    }

    private parseTarget(): string {
        let path = this.expectName().value
        while (true) {
            if (this.acceptPunct('.')) {
                path += '.' + this.expectName().value
            } else if (this.isPunct('[')) {
                this.next()
                const key = this.parseExpression()
                if (typeof key !== 'string' && typeof key !== 'number') this.fail('Index must be a string or number')
                this.expectPunct(']')
                path += typeof key === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? '.' + key : `[${JSON.stringify(key)}]`
            } else {
                return path
            }
        }
    }

    private parseExpression(limit = 0): LuaValue {
        let left: LuaValue

        if (this.isPunct('-') || this.isPunct('#') || this.isName('not')) {
            const op = this.next()
            const operand = this.parseExpression(UNARY_PRIORITY)
            left = this.foldUnary(op, operand)
        } else {
            left = this.parseSimple()
        }

        while (true) {
            const op = this.peek()
            const priority = op.type === 'punct' ? BINARY_PRIORITY[op.value] : undefined
            if (!priority || priority.left <= limit) break
            this.next()
            const right = this.parseExpression(priority.right)
            left = this.foldBinary(op, left, right)
        }

        return left
    }

    private parseSimple(): LuaValue {
        const value = this.parsePrimary()
        while (this.isPunct('::')) {
            this.next()
            this.skipType()
        }
        return value
    }

    private parsePrimary(): LuaValue {
        const token = this.peek()

        if (token.type === 'number') {
            this.next()
            return token.number!
        }
        if (token.type === 'string') {
            this.next()
            return token.value
        }
        if (token.type === 'punct' && token.value === '{') return this.parseTable()
        if (token.type === 'punct' && token.value === '(') {
            this.next()
            const inner = this.parseExpression()
            this.expectPunct(')')
            return inner
        }
        if (token.type === 'name') {
            if (token.value === 'true') { this.next(); return true }
            if (token.value === 'false') { this.next(); return false }
            if (token.value === 'nil') { this.next(); return null }
            if (token.value === 'function') this.fail('Functions are not supported, paste only data tables', token)
            return this.parseNameExpression()
        }

        return this.fail(`Unexpected '${token.value || 'end of input'}'`, token)
    }

    private parseNameExpression(): LuaValue {
        let path = this.next().value

        while (true) {
            if (this.isPunct('.')) {
                this.next()
                path += '.' + this.expectName().value
            } else if (this.isPunct(':') && this.peek(1).type === 'name') {
                this.next()
                path += ':' + this.next().value
                return this.parseCall(path)
            } else if (this.isPunct('[')) {
                this.next()
                const key = this.parseExpression()
                if (typeof key !== 'string' && typeof key !== 'number') this.fail('Index must be a string or number')
                this.expectPunct(']')
                path += `[${JSON.stringify(key)}]`
            } else {
                break
            }
        }

        const token = this.peek()
        if ((token.type === 'punct' && (token.value === '(' || token.value === '{')) || token.type === 'string') {
            return this.parseCall(path)
        }
        return { kind: 'ref', path }
    }

    private parseCall(callee: string): LuaValue {
        const token = this.peek()
        let args: LuaValue[]

        if (token.type === 'string') {
            this.next()
            args = [token.value]
        } else if (token.type === 'punct' && token.value === '{') {
            args = [this.parseTable()]
        } else {
            this.expectPunct('(')
            args = []
            if (!this.isPunct(')')) {
                args.push(this.parseExpression())
                while (this.acceptPunct(',')) args.push(this.parseExpression())
            }
            this.expectPunct(')')
        }

        const after = this.peek()
        if (after.type === 'punct' && ['(', '.', ':', '['].includes(after.value)) {
            this.fail('Chained calls are not supported', after)
        }

        return { kind: 'call', callee, args }
    }

    private parseTable(): LuaTable {
        this.expectPunct('{')
        const table: LuaTable = { kind: 'table', items: [], fields: [] }

        while (!this.isPunct('}')) {
            if (this.isPunct('[')) {
                const open = this.next()
                const key = this.parseExpression()
                if (typeof key !== 'string' && typeof key !== 'number') this.fail('Table keys must be strings or numbers', open)
                this.expectPunct(']')
                this.expectPunct('=')
                const field: LuaField = { key: key as string | number, value: this.parseExpression() }
                table.fields.push(field)
            } else if (this.peek().type === 'name' && this.peek(1).type === 'punct' && this.peek(1).value === '=') {
                const key = this.next().value
                this.next()
                table.fields.push({ key, value: this.parseExpression() })
            } else {
                table.items.push(this.parseExpression())
            }

            if (!this.acceptPunct(',') && !this.acceptPunct(';')) break
        }

        this.expectPunct('}')
        return table
    }

    private skipType(): void {
        if (this.isPunct('|') || this.isPunct('&')) this.next()
        this.skipTypeTerm()
        while (this.isPunct('|') || this.isPunct('&')) {
            this.next()
            this.skipTypeTerm()
        }
    }

    private skipTypeTerm(): void {
        const token = this.peek()

        if (token.type === 'punct' && (token.value === '{' || token.value === '(')) {
            this.skipBalanced()
        } else if (token.type === 'punct' && token.value === '...') {
            this.next()
            if (this.peek().type === 'name') this.skipTypeTerm()
        } else if (token.type === 'string') {
            this.next()
        } else if (token.type === 'name') {
            this.next()
            if (token.value === 'typeof' && this.isPunct('(')) {
                this.skipBalanced()
            } else {
                while (this.isPunct('.')) {
                    this.next()
                    this.expectName()
                }
                if (this.isPunct('<')) this.skipBalanced()
            }
        } else {
            this.fail('Expected a type', token)
        }

        while (this.isPunct('?')) this.next()
        if (this.isPunct('->')) {
            this.next()
            this.skipType()
        }
    }

    private skipBalanced(): void {
        const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']', '<': '>' }
        const stack: string[] = []
        do {
            const token = this.next()
            if (token.type === 'eof') this.fail('Unfinished type annotation', token)
            if (token.type !== 'punct') continue
            if (token.value in pairs) {
                stack.push(pairs[token.value])
            } else if (token.value === stack[stack.length - 1]) {
                stack.pop()
            }
        } while (stack.length > 0)
    }

    private foldUnary(op: Token, operand: LuaValue): LuaValue {
        if (op.value === '-' && typeof operand === 'number') return -operand
        if (op.value === 'not' && typeof operand === 'boolean') return !operand
        return this.fail(`Cannot evaluate '${op.value}' here, only literal values are supported`, op)
    }

    private foldBinary(op: Token, left: LuaValue, right: LuaValue): LuaValue {
        if (op.value === '..') {
            const isText = (v: LuaValue) => typeof v === 'string' || typeof v === 'number'
            if (isText(left) && isText(right)) return String(left) + String(right)
        } else if (typeof left === 'number' && typeof right === 'number') {
            switch (op.value) {
                case '+': return left + right
                case '-': return left - right
                case '*': return left * right
                case '/': return left / right
                case '//': return Math.floor(left / right)
                case '%': return left - Math.floor(left / right) * right
                case '^': return left ** right
            }
        }
        return this.fail(`Cannot evaluate '${op.value}' here, only literal values are supported`, op)
    }

    private peek(offset = 0): Token {
        return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)]
    }

    private next(): Token {
        const token = this.peek()
        if (token.type !== 'eof') this.index++
        return token
    }

    private atEof(): boolean {
        return this.peek().type === 'eof'
    }

    private isPunct(value: string): boolean {
        const token = this.peek()
        return token.type === 'punct' && token.value === value
    }

    private isName(value: string): boolean {
        const token = this.peek()
        return token.type === 'name' && token.value === value
    }

    private acceptPunct(value: string): boolean {
        if (!this.isPunct(value)) return false
        this.next()
        return true
    }

    private expectPunct(value: string): Token {
        const token = this.peek()
        if (token.type !== 'punct' || token.value !== value) {
            this.fail(`Expected '${value}' but found '${token.value || 'end of input'}'`, token)
        }
        return this.next()
    }

    private expectName(): Token {
        const token = this.peek()
        if (token.type !== 'name') this.fail(`Expected a name but found '${token.value || 'end of input'}'`, token)
        return this.next()
    }

    private fail(message: string, token: Token = this.peek()): never {
        throw new LuaSyntaxError(message, token.line, token.column)
    }
}
