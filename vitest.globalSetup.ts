import { loadEnv } from 'vite'

export default function setup() {
    const env = loadEnv('', process.cwd(), '')
    Object.assign(process.env, env)
}
